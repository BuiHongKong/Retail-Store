# Monitoring & giả lập user (Production)

Monitoring (Grafana, Prometheus, Loki) và load test (k6) chỉ chạy cho **production**. Staging không có observability hay giả lập user.

---

## Các bước kích hoạt Monitoring

Làm lần lượt; nếu prod đã chạy rồi thì có thể bắt đầu từ bước 2.

### Bước 1: Đảm bảo Production đã chạy

Monitoring cần hạ tầng prod (VPC, ALB, ECS app, RDS nếu dùng) đã được deploy. Nếu chưa:

- Trong repo (hoặc repo prod nếu tách): cấu hình **terraform-prod** (biến `db_password`, `jwt_secret`, `admin_jwt_secret`, v.v. trong `terraform.tfvars` hoặc env).
- Chạy `terraform init` rồi `terraform apply` trong thư mục **terraform-prod** để tạo VPC, ALB, ECS cluster, 6 service (frontend, main, cart, checkout, auth, admin), RDS (nếu bật).
- Deploy ứng dụng lên ECS (image từ ECR, qua CI/CD deploy prod). Backend phải có endpoint **GET /metrics** (project này đã có sẵn qua prom-client).

Nếu prod đã có từ trước, chỉ cần đảm bảo app đang chạy và backend trả `/metrics` (kiểm tra: `curl http://<prod-alb>/api/products` và sau này `http://<prod-alb>/api/...` từ main service — metrics scrape qua service discovery nội bộ, không cần gọi qua ALB).

### Bước 2: Cấu hình biến Terraform (Grafana)

Trong thư mục **terraform-prod**:

- Mở hoặc tạo file **terraform.tfvars** (hoặc dùng biến môi trường `TF_VAR_...`).
- Đặt mật khẩu đăng nhập Grafana admin:
  - **grafana_admin_password** (string, sensitive). Ví dụ: `grafana_admin_password = "your-secure-password"`. Nếu không set, mặc định là `"admin"` — nên đổi trong production.

Các biến khác (region, ECR name, RDS, JWT...) giữ đúng với lần deploy prod trước; không cần thêm biến nào khác cho observability.

### Bước 3: Apply Terraform prod (Observability)

Vẫn trong **terraform-prod**:

1. **Init (nếu chưa hoặc đã thêm module):**
   ```bash
   cd terraform-prod
   terraform init
   ```

2. **Xem thay đổi:**
   ```bash
   terraform plan
   ```
   Kỳ vọng: tạo **service discovery** (namespace `retail-store.local`, các service backend + prometheus), cập nhật **ECS service** backend (thêm `service_registries`), tạo **module observability** (security group, log groups, task definitions và ECS services cho Prometheus, Grafana, Loki), thêm **ALB listener rule** `/grafana` → Grafana, thêm **security group rule** cho phép Prometheus scrape app (port 3000–3004).

3. **Áp dụng:**
   ```bash
   terraform apply
   ```
   Nhập `yes` khi được hỏi. Đợi Terraform tạo xong (vài phút).

### Bước 4: Đợi ECS services Observability healthy

Sau khi apply xong:

- Vào **AWS Console → ECS → Clusters** → chọn cluster tên dạng **retail-store-prod-obs** (prefix theo `project_name` và `environment` trong Terraform).
- Kiểm tra 3 service: **prometheus**, **grafana**, **loki** đều **Running**, task **Healthy** (nếu có health check). Grafana có health check qua ALB path `/grafana/api/health`.

Nếu task nào **Pending** hoặc **Stopped**, xem **Logs** trong CloudWatch (log group `/ecs/retail-store-prod-obs-prometheus`, `...-grafana`, `...-loki`) để xử lý lỗi (vd thiếu quyền, sai config).

### Bước 5: Lấy URL Grafana và đăng nhập

Trong thư mục **terraform-prod**:

```bash
terraform output grafana_url
```

Ví dụ output: `http://retail-store-prod-xxxxx.ap-southeast-1.elb.amazonaws.com/grafana`. Mở URL này trong trình duyệt.

- **Đăng nhập:** user `admin`, mật khẩu là giá trị đã set ở **grafana_admin_password** (bước 2).
- Lần đầu đăng nhập Grafana có thể yêu cầu đổi mật khẩu — tùy cấu hình.

### Bước 6: Kiểm tra datasource Prometheus

Trong Grafana:

- Vào **Connections → Data sources**. Sẽ thấy **Prometheus** đã được cấu hình (URL `http://prometheus.retail-store.local:9090`).
- Mở datasource Prometheus → nút **Save & test**. Nếu **Success**, Prometheus đang scrape được; nếu lỗi, kiểm tra ECS task Prometheus đã chạy và service discovery trong VPC prod.

### Bước 7: Kiểm tra metrics và Prometheus scrape

- **Backend:** Mỗi server (main, cart, checkout, auth, admin) đăng ký metric trong `backend/services/metrics.js` (một register chung) và expose **GET /metrics** tại root (không phải /api/metrics). Chỉ **auth** tăng `auth_logins_total`; chỉ **checkout** tăng `product_sales_total` và `checkout_payments_total`.
- **Prometheus:** Scrape từng backend qua DNS `&lt;svc&gt;.retail-store.local:&lt;port&gt;`, `metrics_path: /metrics`, `job_name` = tên service (main, cart, checkout, auth, admin). Cấu hình từ `terraform-prod/modules/observability/prometheus.yml.tpl`.
- **Cách kiểm tra:**
  1. **Prometheus UI** (nếu truy cập được, ví dụ port-forward ECS task Prometheus 9090): **Status → Targets**. Phải thấy 5 target: main, cart, checkout, auth, admin đều **UP**. Nếu Down: kiểm tra security group (observability SG → ECS 3000–3004), service discovery (ECS backend có `service_registries`), và task đang chạy.
  2. **Grafana → Explore**, datasource Prometheus: chạy `up{job=~"main|cart|checkout|auth|admin"}` → phải có 5 series, value 1. Sau đó thử `auth_logins_total` (có data sau khi có login), `product_sales_total` (có data sau khi có checkout thành công).

### Nếu Grafana hiển thị "No data" (trong khi Loki có log)

- **Nguyên nhân thường gặp:** Prometheus không scrape được backend (targets Down) hoặc Grafana không kết nối được Prometheus.
- **Cách xử lý:**
  1. **Grafana → Connections → Data sources → Prometheus → Save & test.** Nếu báo lỗi: Grafana không resolve được `prometheus.retail-store.local` hoặc không kết nối được — kiểm tra ECS task Prometheus đang chạy và cùng VPC.
  2. **Kiểm tra Prometheus Targets:** Vào Prometheus UI (Status → Targets). Nếu main, cart, checkout, auth, admin là **DOWN**: Prometheus không scrape được app — kiểm tra rule security group cho phép **observability SG → ECS SG** ingress port 3000–3004 (`terraform-prod/observability.tf`: `ecs_allow_observability_scrape`), và ECS backend services có `service_registries` trỏ tới service discovery.
  3. **Grafana Explore:** Chọn datasource Prometheus, chạy `up`. Nếu không có series: Prometheus chưa có dữ liệu từ bất kỳ target nào (xem lại bước 2). Nếu có `up{job="prometheus"}` nhưng không có job main/cart/...: chỉ có Prometheus self-scrape hoạt động, các backend target Down.
  4. Sau khi sửa cấu hình (Terraform hoặc security group), cần **redeploy** task Prometheus (ví dụ ECS → force new deployment) để áp dụng thay đổi.

### Bước 8: Import dashboard ứng dụng

Để xem request rate, latency, 5xx theo service:

1. Trong Grafana: **Dashboards → New → Import**.
2. **Upload JSON file**: chọn file **terraform-prod/modules/observability/grafana-dashboard.json** (trong repo).
3. Chọn datasource **Prometheus** (nếu được hỏi) → **Import**.

Dashboard **Retail Store - App metrics** sẽ hiển thị các panel: request rate theo job (service), duration p50/p99, 5xx rate, total requests (1h). Dữ liệu có sau khi app prod nhận traffic và Prometheus đã scrape `/metrics` (scrape interval 15s).

---

## Observability (Grafana, Prometheus, Loki)

Stack deploy qua **terraform-prod** (module `terraform-prod/modules/observability`).

- **Grafana:** truy cập qua ALB prod path **/grafana** (vd `http://<prod-alb-dns>/grafana`). Lấy URL từ Terraform output: `terraform output grafana_url` trong thư mục `terraform-prod`. Đăng nhập admin với mật khẩu trong biến `grafana_admin_password`. Datasource Prometheus đã cấu hình (scrape app prod qua service discovery).
- **Prometheus:** scrape `/metrics` của từng backend prod (main, cart, checkout, auth, admin) qua DNS `*.retail-store.local`.
- **Loki:** chạy trong cluster prod; có thể thêm Loki làm datasource trong Grafana (URL `http://loki.retail-store.local:3100`) nếu ship log tới Loki.

Backend expose **GET /metrics** (prom-client) trên mọi server; Prometheus thu thập `http_requests_total`, `http_request_duration_seconds`. Import dashboard có sẵn: trong Grafana → Import → upload file `terraform-prod/modules/observability/grafana-dashboard.json`.

---

## Giả lập user (k6)

Script **scripts/load/k6-prod.js** mô phỏng traffic vào **prod**: xem categories, products, chi tiết sản phẩm, thêm giỏ, checkout preview, likes.

- **Chạy local:** `k6 run -e BASE_URL=http://<prod-alb> scripts/load/k6-prod.js`
- **GitHub Actions:** Đặt secret **PROD_URL** (vd `http://<prod-alb-dns>`) trong repo, rồi chạy workflow **Load test (prod)** (manual hoặc theo lịch cron).

Metrics xem trên Grafana prod tại `/grafana`.

push
