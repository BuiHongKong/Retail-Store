# Hướng dẫn Staging và Production (2 repo)

Repo hiện tại là **Staging repo**. Khi merge vào `main` thì tự động build và deploy lên môi trường **staging** trên AWS. Sau đó **Approve** environment \`prod\` thì deploy **production** chạy (cùng workflow). Repo **prod** chỉ dùng để chạy **Rollback Prod** (về bản trước).

---

## 1. Tổng quan flow

| Bước | Repo | Hành động |
|------|------|-----------|
| 1 | Staging repo (repo này) | Merge/push vào `main` → **tự động** build + push ECR + deploy ECS **staging** |
| 2 | Staging repo | Khi staging đã test OK → **Approve** environment \`prod\` → deploy prod chạy (trong cùng workflow) |
| 3 | Staging repo | Sau khi staging xong → **Approve** environment \`prod\` → job deploy prod chạy (build + push ECR prod + deploy ECS **prod**) |
| 4 | Prod repo | Nếu prod lỗi → **manual** chạy **"Rollback Prod"** (về bản prod-previous, 1 version back) |

---

## 2. Điều kiện cần có

### 2.1 Terraform (Staging)

Trong repo có sẵn thư mục **terraform-staging/** (region mặc định **ap-southeast-1**): VPC, ECR, ALB, ECS Fargate, RDS (optional). Chạy `terraform apply` trước khi cấu hình GitHub. Chi tiết: [terraform-staging/README.md](../terraform-staging/README.md).

### 2.2 AWS (Staging)

- **ECR**: 2 repository (staging): `retail-store-frontend-staging`, `retail-store-backend-staging` (hoặc tên bạn đặt).
- **ECS**: 1 cluster (vd `retail-staging`), 6 service: `frontend`, `main`, `cart`, `checkout`, `auth`, `admin`. Task definition của từng service trỏ image ECR tag `staging-latest` (hoặc `staging-<sha>`).
- **ALB** (và tuỳ chọn CloudFront): listener, target group cho từng service, path routing `/` → frontend, `/api` → main, `/api/cart` → cart, v.v.
- **RDS** (hoặc DB staging): PostgreSQL; biến môi trường `DATABASE_URL` (và JWT secrets) đưa vào ECS task definition qua SSM/Secrets Manager.

### 2.3 GitHub — Staging repo (repo này)

**Secrets:**

- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`: IAM user có quyền ECR push, ECS update-service.
- `AWS_ACCOUNT_ID`: 12 chữ số AWS account (để build ECR registry URL).

**Variables (Settings → Variables):**

- `AWS_REGION`: vd `ap-southeast-1`.
- (Tuỳ chọn) `ECR_FRONTEND_STAGING`, `ECR_BACKEND_STAGING`: tên ECR repo nếu khác mặc định.
- (Tuỳ chọn) `ECS_CLUSTER_STAGING`: tên ECS cluster staging.

**Cho job Deploy to Prod (chạy trong staging repo sau khi Approve):**

- Variables: `ECR_FRONTEND_PROD`, `ECR_BACKEND_PROD`, `ECS_CLUSTER_PROD` (mặc định trong workflow).

### 2.4 Prod repo

- Tạo repo mới (vd `Retail-Store-prod`, https://github.com/BuiHongKong/Retail-Store-prod). Code sẽ được push từ staging repo qua workflow "Promote to Prod" hoặc `git push prod-repo main:main` thủ công.
- Cấu hình **Secrets** và **Variables** (AWS, ECS cluster prod). Copy workflow từ `.github/workflows/for-prod-repo/rollback-prod.yml.example` vào prod thành `rollback-prod.yml`.

---

## 3. Setup step-by-step để chạy

Làm lần lượt theo môi trường bạn muốn chạy: local, staging (AWS), hoặc production.

### 3.1 Chạy local (development)

Dùng khi dev trên máy, test trước khi push.

| Bước | Hành động | Ghi chú |
|------|-----------|--------|
| 1 | **Clone repo** (nếu chưa có): `git clone <url-repo> Retail-Store` và `cd Retail-Store` | |
| 2 | **PostgreSQL**: Ở thư mục gốc chạy `docker compose up -d` | Kiểm tra: `docker ps` thấy container postgres. |
| 3 | **Backend**: `cd backend` → `npm install` | |
| 4 | **Tạo `.env`** trong `backend/`: `DATABASE_URL="postgresql://postgres:postgres@localhost:5433/retail_store"`, `PORT=3000`, `CART_PORT=3001`, `CHECKOUT_PORT=3002`, `AUTH_PORT=3003`, `JWT_SECRET=your-secret-change-in-production`, `ADMIN_PORT=3004`, `ADMIN_JWT_SECRET=admin-secret-change-in-production` | Nếu dùng PostgreSQL khác, sửa `DATABASE_URL`. |
| 5 | **Migration**: Trong `backend/` chạy `npx prisma migrate deploy` | Repo đã có sẵn migrations. |
| 6 | **Seed**: Trong `backend/` chạy `npx prisma db seed` | Tạo dữ liệu mẫu + user demo/admin. |
| 7 | **Frontend**: `cd frontend` → `npm install` | |
| 8 | **Chạy backend**: Trong `backend/` mở 5 terminal, mỗi cái chạy một lệnh: `npm run dev:main`, `npm run dev:cart`, `npm run dev:checkout`, `npm run dev:auth`, `npm run dev:admin` | Port 3000–3004. |
| 9 | **Chạy frontend**: Trong `frontend/` chạy `npm run dev` | Mở http://localhost:5173. |

Chi tiết đầy đủ (PostgreSQL cài sẵn, tạo migration mới, script chạy một lệnh): xem [README.md](../README.md).

### 3.2 Chạy Staging (trên AWS)

Staging deploy tự động khi push/merge vào `main`. Cần chuẩn bị một lần.

| Bước | Hành động | Ghi chú |
|------|-----------|--------|
| 1 | **Terraform**: Vào `terraform-staging/`, cấu hình `terraform.tfvars` (copy từ `terraform.tfvars.example`), chạy `terraform init` rồi `terraform apply` | Tạo VPC, ECR, ECS, ALB, RDS (xem [terraform-staging/README.md](../terraform-staging/README.md)). |
| 2 | **GitHub Secrets** (repo này): Thêm `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ACCOUNT_ID` | IAM user cần quyền ECR push, ECS update-service. |
| 3 | **GitHub Variables** (repo này): Thêm `AWS_REGION` (vd `ap-southeast-1`). Tuỳ chọn: `ECR_FRONTEND_STAGING`, `ECR_BACKEND_STAGING`, `ECS_CLUSTER_STAGING` nếu khác mặc định | |
| 4 | **Push/merge vào `main`** | Workflow "Deploy to Staging" chạy: build Docker → push ECR → update ECS. |
| 5 | **Lấy URL staging**: Terraform output `staging_url` hoặc AWS Console → EC2 → Load Balancers → ALB staging → DNS name | Xem mục 4 bên dưới. |

### 3.3 Chạy Production

Production dùng repo riêng; code đẩy từ repo này sang rồi deploy trong prod repo.

| Bước | Hành động | Ghi chú |
|------|-----------|--------|
| 1 | **Trong prod repo**: Cấu hình Secrets (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY), Variables (AWS_REGION, ECS_CLUSTER_PROD), copy `.github/workflows/for-prod-repo/rollback-prod.yml.example` thành `rollback-prod.yml`. | |
| 2 | **Staging repo**: Push/merge \`main\` → deploy staging chạy → **Review deployments** → Approve environment \`prod\` → job deploy prod chạy. | |
| 3 | **(Khi cần) Rollback**: Trong prod repo chạy workflow "Rollback Prod". | Prod chỉ 2 version: latest và previous; rollback = về prod-previous. |

---

## 4. Workflow trong repo này (Staging)

- **CI** (`.github/workflows/ci.yml`): Chạy khi push/PR lên `main` hoặc `develop` — lint frontend.
- **Deploy to Staging** (`.github/workflows/deploy-staging.yml`): Chạy khi **push/merge vào `main`** — build Docker (frontend + backend), push ECR tag `staging-<sha>` và `staging-latest`, gọi `aws ecs update-service` cho 6 service staging.
- **Deploy to Prod** (job trong `deploy-staging.yml`): Sau khi staging xong, **Approve** environment \`prod\` → build + push ECR prod + update ECS prod.

---

## 5. Staging URL

Sau khi deploy staging thành công, URL staging nằm ở:

- **Terraform**: output `staging_url` (nếu dùng Terraform tạo ALB/CloudFront).
- **AWS Console**: EC2 → Load Balancers → chọn ALB staging → tab Details → **DNS name**. Hoặc CloudFront → Distributions → domain name.

Workflow Deploy to Staging có gợi ý trong job summary; URL thật lấy từ Terraform/Console.

---

## 6. Prod repo — Deploy và Rollback

- Copy `.github/workflows/for-prod-repo/rollback-prod.yml.example` vào prod repo thành `.github/workflows/rollback-prod.yml`. Rollback = cập nhật ECS để dùng image tag **prod-previous** (1 bản trước). Không cần nhập tag — prod chỉ có 2 version: latest và previous.

---

## 6. Docker build local (kiểm tra)

```bash
# Backend
docker build -t retail-backend:test -f backend/Dockerfile backend/
docker run --rm -e SERVICE=main -e PORT=3000 -p 3000:3000 retail-backend:test

# Frontend
docker build -t retail-frontend:test -f frontend/Dockerfile frontend/
docker run --rm -p 8080:80 retail-frontend:test
```

Mở `http://localhost:8080` (frontend); API cần trỏ tới backend (vd cùng host với path `/api` qua reverse proxy hoặc CORS).

---

## 8. Tóm tắt file đã thêm

| File | Mô tả |
|------|--------|
| `backend/Dockerfile` | Build image backend; env `SERVICE` (main/cart/checkout/auth/admin) chọn server. |
| `backend/entrypoint.sh` | Script chạy đúng file Node theo `SERVICE`. |
| `frontend/Dockerfile` | Multi-stage: build Vite, serve bằng nginx. |
| `frontend/nginx.conf` | Cấu hình nginx (SPA try_files). |
| `.github/workflows/ci.yml` | Lint frontend. |
| `.github/workflows/deploy-staging.yml` | Push `main` → build → ECR → ECS staging. |
| `.github/workflows/deploy-staging.yml` | Push `main` → deploy staging; Approve \`prod\` → deploy prod. |
| `.github/workflows/for-prod-repo/rollback-prod.yml.example` | Mẫu workflow rollback (copy vào prod repo thành `rollback-prod.yml`). |
