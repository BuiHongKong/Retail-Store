# Hướng dẫn Staging và Production (2 repo)

Repo hiện tại là **Staging repo**. Khi merge vào `main` thì tự động build và deploy lên môi trường **staging** trên AWS. Môi trường **production** dùng repo riêng; code được đẩy sang bằng bước **promote** thủ công, sau đó trong prod repo chạy **Deploy to Prod** và khi cần **Rollback Prod** cũng trong prod repo.

---

## 1. Tổng quan flow

| Bước | Repo | Hành động |
|------|------|-----------|
| 1 | Staging repo (repo này) | Merge/push vào `main` → **tự động** build + push ECR + deploy ECS **staging** |
| 2 | Staging repo | Khi staging đã test OK → **manual** chạy workflow **"Promote to Prod Repo"** để đẩy `main` sang prod repo |
| 3 | Prod repo | **Manual** chạy workflow **"Deploy to Prod"** → build + push ECR prod + deploy ECS **prod** |
| 4 | Prod repo | Nếu prod lỗi → **manual** chạy **"Rollback Prod"** với image tag cũ |

---

## 2. Điều kiện cần có

### 2.1 Terraform (Staging)

Trong repo có sẵn thư mục **terraform/** (region mặc định **ap-southeast-1**): VPC, ECR, ALB, ECS Fargate, RDS (optional). Chạy `terraform apply` trước khi cấu hình GitHub. Chi tiết: [terraform/README.md](../terraform/README.md).

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

- `AWS_REGION`: vd `us-east-1`.
- (Tuỳ chọn) `ECR_FRONTEND_STAGING`, `ECR_BACKEND_STAGING`: tên ECR repo nếu khác mặc định.
- (Tuỳ chọn) `ECS_CLUSTER_STAGING`: tên ECS cluster staging.

**Promote to Prod (nếu dùng workflow Promote):**

- `PROD_REPO_URL`: URL prod repo, vd `https://github.com/owner/retail-store-prod`.
- Secret `PROD_REPO_TOKEN`: PAT (Personal Access Token) có quyền push vào prod repo.

### 2.4 Prod repo

- Tạo repo mới (vd `retail-store-prod`). Code sẽ được push từ staging repo qua workflow "Promote to Prod" hoặc `git push prod-repo main:main` thủ công.
- Cấu hình **Secrets** và **Variables** tương tự (ECR prod, ECS cluster prod). Copy workflow từ `.github/workflows/examples/` (đổi tên bỏ `.example`).

---

## 3. Workflow trong repo này (Staging)

- **CI** (`.github/workflows/ci.yml`): Chạy khi push/PR lên `main` hoặc `develop` — lint frontend.
- **Deploy to Staging** (`.github/workflows/deploy-staging.yml`): Chạy khi **push/merge vào `main`** — build Docker (frontend + backend), push ECR tag `staging-<sha>` và `staging-latest`, gọi `aws ecs update-service` cho 6 service staging.
- **Promote to Prod Repo** (`.github/workflows/promote-to-prod.yml`): **Manual** — đẩy nhánh `main` sang prod repo. Cần cấu hình `PROD_REPO_URL` và `PROD_REPO_TOKEN`.

---

## 4. Staging URL

Sau khi deploy staging thành công, URL staging nằm ở:

- **Terraform**: output `staging_url` (nếu dùng Terraform tạo ALB/CloudFront).
- **AWS Console**: EC2 → Load Balancers → chọn ALB staging → tab Details → **DNS name**. Hoặc CloudFront → Distributions → domain name.

Workflow Deploy to Staging in gợi ý trong job summary; URL thật lấy từ Terraform/Console.

---

## 5. Prod repo — Deploy và Rollback

- Copy `.github/workflows/examples/deploy-prod.yml.example` vào prod repo thành `.github/workflows/deploy-prod.yml`. Cấu hình variables/secrets (ECR prod, ECS cluster prod, AWS credentials). Chạy **manual** khi đã promote code.
- Copy `.github/workflows/examples/rollback-prod.yml.example` thành `.github/workflows/rollback-prod.yml`. Rollback = deploy lại bản cũ: cần cập nhật **task definition** trên ECS để trỏ image tag cũ (vd `prod-abc123`), rồi `update-service`. Có thể dùng AWS Console (ECS → Task definitions → Create revision với image tag mới) hoặc script/CLI.

Sau mỗi lần deploy prod nên ghi lại **image tag** (vd trong GitHub Release hoặc file) để khi rollback biết tag cần dùng.

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

## 7. Tóm tắt file đã thêm

| File | Mô tả |
|------|--------|
| `backend/Dockerfile` | Build image backend; env `SERVICE` (main/cart/checkout/auth/admin) chọn server. |
| `backend/entrypoint.sh` | Script chạy đúng file Node theo `SERVICE`. |
| `frontend/Dockerfile` | Multi-stage: build Vite, serve bằng nginx. |
| `frontend/nginx.conf` | Cấu hình nginx (SPA try_files). |
| `.github/workflows/ci.yml` | Lint frontend. |
| `.github/workflows/deploy-staging.yml` | Push `main` → build → ECR → ECS staging. |
| `.github/workflows/promote-to-prod.yml` | Manual: push `main` sang prod repo. |
| `.github/workflows/examples/deploy-prod.yml.example` | Mẫu workflow deploy prod (copy vào prod repo). |
| `.github/workflows/examples/rollback-prod.yml.example` | Mẫu workflow rollback prod (copy vào prod repo). |
