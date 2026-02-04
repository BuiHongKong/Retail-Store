# Hướng dẫn Setup GitHub — Step by Step

Hướng dẫn cấu hình GitHub Actions và Secrets/Variables để chạy CI, Deploy Staging, và Promote to Prod.

---

## 1. Database hiện đang dùng gì trên AWS?

Project dùng **AWS RDS (Relational Database Service)** — dịch vụ database quản lý của AWS.

| Thuộc tính | Giá trị |
|------------|---------|
| **Dịch vụ** | AWS RDS (PostgreSQL) |
| **Engine** | PostgreSQL 15 |
| **Instance** | `db.t3.micro` (tier thấp, phù hợp staging) |
| **Storage** | 20 GB |
| **Database name** | `retail_store` |
| **User** | `postgres` |
| **Mạng** | Private subnet (không public), ECS kết nối qua Security Group |

**Tuỳ chọn:**

- `create_rds = true` (mặc định): Tạo RDS PostgreSQL trong Terraform — staging dùng DB trên AWS.
- `create_rds = false`: Không tạo RDS; dùng DB bên ngoài (Neon, Supabase, v.v.) qua biến `database_url` trong Terraform.

Chi tiết cấu hình: xem `terraform/rds.tf` và `terraform/README.md`.

---

## 2. Tổng quan cấu hình GitHub

| Loại | Tên | Cần cho |
|------|-----|---------|
| **Secrets** | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ACCOUNT_ID` | Deploy Staging |
| **Secrets** | `PROD_REPO_TOKEN` | Promote to Prod (nếu dùng) |
| **Variables** | `AWS_REGION` | Deploy Staging |
| **Variables** | `ECR_FRONTEND_STAGING`, `ECR_BACKEND_STAGING`, `ECS_CLUSTER_STAGING` | Deploy Staging (tuỳ chọn, có mặc định) |
| **Variables** | `PROD_REPO_URL` | Promote to Prod |

---

## 3. Step-by-step cấu hình GitHub

### Bước 1: Mở Settings của repo

1. Vào repo trên GitHub.
2. Click **Settings** (tab trên cùng).
3. Trong menu bên trái: **Secrets and variables** → **Actions**.

---

### Bước 2: Thêm Secrets

Bấm **New repository secret** và thêm từng secret sau:

| Secret | Giá trị | Cách lấy |
|--------|---------|----------|
| `AWS_ACCESS_KEY_ID` | Access key của IAM user | AWS Console → IAM → Users → Security credentials → Create access key. User cần quyền: `ecr:GetAuthorizationToken`, `ecr:*`, `ecs:UpdateService`, `ecs:DescribeServices`. |
| `AWS_SECRET_ACCESS_KEY` | Secret key tương ứng | Cùng lúc tạo access key. |
| `AWS_ACCOUNT_ID` | 12 chữ số AWS account | AWS Console → góc trên phải, account dropdown → Account ID. Hoặc: `aws sts get-caller-identity --query Account --output text`. |
| `PROD_REPO_TOKEN` | Personal Access Token (PAT) | Chỉ cần nếu dùng Promote to Prod. GitHub → Settings → Developer settings → Personal access tokens → Generate new token. Scope: `repo` (full). |

---

### Bước 3: Thêm Variables

Bấm tab **Variables** → **New repository variable** và thêm:

| Variable | Giá trị mẫu | Ghi chú |
|----------|-------------|---------|
| `AWS_REGION` | `ap-southeast-1` | Region chạy Terraform/ECS (phải trùng với Terraform). |
| `ECR_FRONTEND_STAGING` | `retail-store-frontend-staging` | Tên ECR frontend. Bỏ qua nếu dùng mặc định. |
| `ECR_BACKEND_STAGING` | `retail-store-backend-staging` | Tên ECR backend. Bỏ qua nếu dùng mặc định. |
| `ECS_CLUSTER_STAGING` | `retail-staging` | Tên ECS cluster. Khớp với output `ecs_cluster_name` của Terraform. |
| `PROD_REPO_URL` | `https://github.com/owner/retail-store-prod` | Chỉ cần nếu dùng Promote to Prod. URL repo production. |

---

### Bước 4: Kiểm tra Terraform đã chạy

Trước khi Deploy to Staging chạy được, cần:

1. Terraform đã `apply` xong (VPC, ECR, ECS, ALB, RDS nếu dùng).
2. ECR repositories đã tồn tại (tên khớp với Variables).
3. ECS cluster và 6 services đã tạo: `frontend`, `main`, `cart`, `checkout`, `auth`, `admin`.

Nếu chưa: xem `terraform/README.md` và `docs/STAGING_PROD.md`.

---

### Bước 5: Chạy Deploy to Staging

1. Push hoặc merge code vào nhánh **`main`**.
2. Workflow **"Deploy to Staging"** chạy tự động.
3. Xem kết quả: tab **Actions** → chọn run vừa chạy.

Lỗi thường gặp:

- ECR/ECS không tồn tại → chạy Terraform trước.
- Secrets/Variables thiếu hoặc sai → kiểm tra lại bước 2 và 3.
- IAM không đủ quyền → thêm policy cần thiết cho user.

---

### Bước 6: Chạy Promote to Prod (tuỳ chọn)

1. Đảm bảo đã cấu hình `PROD_REPO_URL` và `PROD_REPO_TOKEN`.
2. Vào tab **Actions** → workflow **"Promote to Prod Repo"**.
3. Click **Run workflow** (manual).
4. Sau khi xong, vào repo production và chạy workflow **"Deploy to Prod"** (cần cấu hình riêng trong prod repo).

---

## 4. Hướng dẫn chi tiết: Từ repo Staging → tạo repo Prod → Build rồi manual Deploy Prod

Flow tổng thể: **code phát triển và build trên repo Staging** → khi ổn định, **Promote** đẩy code sang repo Prod → trong **repo Prod** chạy **manual Deploy to Prod** để build Docker và deploy lên AWS prod.

### 4.1 Tạo repo Prod trên GitHub

1. Vào GitHub → **New repository**.
2. Đặt tên (vd: `retail-store-prod`), có thể **private**.
3. **Không** tạo README, .gitignore — repo để trống (code sẽ được push từ staging qua Promote).
4. Tạo repo → ghi lại URL, vd: `https://github.com/<owner>/retail-store-prod`.

### 4.2 Chuẩn bị AWS cho Prod (ECR + ECS)

Prod cần infrastructure riêng với Staging. Có 2 hướng:

**Cách A — Dùng Terraform (nên dùng):**

- Copy thư mục `terraform/` sang một repo/config riêng cho prod (hoặc dùng Terraform workspaces).
- Sửa `terraform.tfvars` prod: `environment = "prod"`, tên ECR/ECS khác (vd `retail-store-frontend-prod`, `retail-store-backend-prod`, `retail-prod`).
- Chạy `terraform init` và `terraform apply` để tạo VPC, ECR prod, ECS cluster prod, ALB, RDS prod.

**Cách B — Tạo thủ công trên AWS:**

- **ECR**: Tạo 2 repository: `retail-store-frontend-prod`, `retail-store-backend-prod`.
- **ECS**: Tạo cluster `retail-prod`, 6 services: `frontend`, `main`, `cart`, `checkout`, `auth`, `admin` (task definition trỏ image ECR prod).
- **ALB**: Listener, target groups, path routing tương tự staging.
- **RDS**: Nếu dùng DB riêng cho prod.

### 4.3 Cấu hình repo Prod (Secrets + Variables + Workflow)

Trong repo **Prod** (vd `retail-store-prod`):

**Secrets (Settings → Secrets and variables → Actions):**

| Secret | Giá trị |
|--------|---------|
| `AWS_ACCESS_KEY_ID` | IAM user (có thể dùng chung staging hoặc user riêng prod) |
| `AWS_SECRET_ACCESS_KEY` | Secret tương ứng |
| `AWS_ACCOUNT_ID` | 12 chữ số AWS account |

**Variables:**

| Variable | Giá trị mẫu |
|----------|-------------|
| `AWS_REGION` | `ap-southeast-1` |
| `ECR_FRONTEND_PROD` | `retail-store-frontend-prod` |
| `ECR_BACKEND_PROD` | `retail-store-backend-prod` |
| `ECS_CLUSTER_PROD` | `retail-prod` |

**Workflow Deploy to Prod:**

1. Tạo thư mục `.github/workflows/` trong repo Prod (qua git clone local rồi push, hoặc dùng GitHub web).
2. Copy nội dung từ **repo Staging** file `.github/workflows/examples/deploy-prod.yml.example` vào repo Prod thành `.github/workflows/deploy-prod.yml`.
3. Commit và push lên nhánh `main` của repo Prod.

*(Lưu ý: Lần đầu repo Prod chưa có code, có thể tạo file workflow trước bằng cách clone repo Prod rỗng, tạo `.github/workflows/deploy-prod.yml`, push. Sau khi Promote lần đầu, repo Prod sẽ có đủ code backend/frontend.)*

### 4.4 Flow thực hiện: Build trên Staging → Promote → Manual Deploy Prod

| Bước | Nơi thực hiện | Hành động |
|------|---------------|-----------|
| 1 | **Repo Staging** | Merge/push vào `main` → workflow **Deploy to Staging** tự chạy: build Docker, push ECR staging, deploy ECS staging. |
| 2 | **Repo Staging** | Test staging, đảm bảo ổn định. |
| 3 | **Repo Staging** | Tab **Actions** → chọn workflow **Promote to Prod Repo** → **Run workflow**. Code nhánh `main` được push sang repo Prod (ghi đè `main` của prod). |
| 4 | **Repo Prod** | Tab **Actions** → chọn workflow **Deploy to Prod** → **Run workflow** (manual). Workflow sẽ: checkout code prod (đã promote), build Docker backend + frontend, push ECR prod với tag `prod-<sha>` và `prod-latest`, update 6 ECS services prod. |
| 5 | **Repo Prod** | Ghi lại **image tag** (`prod-<sha>`) trong GitHub Release hoặc file để dùng khi rollback. |

### 4.5 Chi tiết từng bước manual

**Bước 3 — Promote (trong repo Staging):**

1. Vào repo Staging trên GitHub.
2. Tab **Actions** → bên trái chọn **Promote to Prod Repo**.
3. Click **Run workflow** → chọn nhánh `main` → **Run workflow**.
4. Đợi chạy xong. Nếu thành công: repo Prod đã có code mới trên `main`.

**Bước 4 — Deploy Prod (trong repo Prod):**

1. Vào repo Prod trên GitHub.
2. Tab **Actions** → chọn **Deploy to Prod**.
3. Click **Run workflow** → chọn nhánh `main` → **Run workflow**.
4. Workflow sẽ build từ code trong repo Prod, push ECR prod, update ECS prod.
5. Sau khi xong: lấy URL prod từ Terraform output hoặc AWS Console (ALB/CloudFront).

**Rollback Prod (khi cần):**

- Copy `.github/workflows/examples/rollback-prod.yml.example` vào repo Prod thành `rollback-prod.yml`.
- Chạy workflow **Rollback Prod** (manual), nhập image tag cũ (vd `prod-abc1234`).
- *(Lưu ý: Rollback workflow mẫu cần task definition ECS đã trỏ đúng image tag; có thể cần chỉnh task definition trong AWS Console trước rồi mới update-service.)*

### 4.6 Lần đầu Promote — repo Prod rỗng

Repo Prod mới tạo chưa có code. Có 2 cách:

**Cách 1 — Promote trước, workflow sau (khuyến nghị):**

1. Cấu hình `PROD_REPO_URL` và `PROD_REPO_TOKEN` trong repo Staging.
2. Chạy **Promote to Prod Repo** → repo Prod sẽ có đủ code (backend, frontend, .github, ...).
3. Trong repo Prod: thêm Secrets/Variables (bước 4.3), rồi thêm file `deploy-prod.yml` vào `.github/workflows/` (copy từ staging hoặc tạo mới) rồi commit push.
4. Chạy **Deploy to Prod**.

**Cách 2 — Tạo workflow trước:**

1. Clone repo Prod (rỗng) về máy.
2. Tạo `.github/workflows/deploy-prod.yml` (copy từ staging `examples/deploy-prod.yml.example`).
3. Push lên `main` — lúc này repo Prod chỉ có workflow, chưa có backend/frontend.
4. Chạy Promote từ staging → repo Prod sẽ có đủ code.
5. Chạy Deploy to Prod.

---

## 5. Checklist nhanh

- [ ] IAM user có access key, quyền ECR + ECS.
- [ ] Secrets: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ACCOUNT_ID`.
- [ ] Variables: `AWS_REGION` (bắt buộc), `ECS_CLUSTER_STAGING` (nên có nếu khác mặc định).
- [ ] Terraform đã apply, ECR + ECS + ALB đã tạo.
- [ ] Push/merge vào `main` để trigger Deploy to Staging.
- [ ] (Nếu dùng Promote) Thêm `PROD_REPO_URL`, `PROD_REPO_TOKEN`; tạo repo Prod; cấu hình Prod (Secrets, Variables, deploy-prod.yml); chạy Promote rồi Deploy to Prod.
