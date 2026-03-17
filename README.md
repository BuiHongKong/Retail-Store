# Plush Haven — Retail Store

Web bán thú nhồi bông: frontend React (Vite) + backend Express (API sản phẩm, likes, giỏ hàng) + PostgreSQL. **Deployment trên AWS** (Terraform + GitHub Actions).

## Cấu trúc project

```
Retail-Store/
├── backend/              # API Express + Prisma (product, likes, cart, checkout, auth, admin)
├── frontend/             # Web React + Vite (Plush Haven)
├── terraform-staging/    # Infrastructure staging (VPC, ECS, RDS, ECR, ALB)
├── terraform-prod/       # Infrastructure production
├── .github/workflows/    # CI/CD (deploy staging, promote, seed prod, load test)
└── README.md
```

---

## Staging / Production và CI/CD

Repo này là **Staging repo**: merge vào `main` sẽ tự động build và deploy lên môi trường **staging** trên AWS. Môi trường **production** dùng repo riêng; code được đẩy sang bằng bước **promote** thủ công, sau đó trong prod repo chạy **Deploy to Prod** và khi cần **Rollback Prod** cũng trong prod repo.

### Flow tổng quan

| Bước | Repo | Hành động |
|------|------|-----------|
| 1 | Staging repo (repo này) | Merge/push vào `main` → **tự động** build + push ECR + deploy ECS **staging** |
| 2 | Staging repo | Khi staging đã test OK → **manual** chạy workflow **"Promote to Prod Repo"** để đẩy `main` sang prod repo |
| 3 | Prod repo | **Manual** chạy workflow **"Deploy to Prod"** → build + push ECR prod + deploy ECS **prod** |
| 4 | Prod repo | Nếu prod lỗi → **manual** chạy **"Rollback Prod"** với image tag cũ |

### Điều kiện — Terraform Staging

Thư mục **terraform-staging/** (region mặc định **ap-southeast-1**): VPC, ECR, ALB, ECS Fargate, RDS (optional).

- **Prerequisites:** Terraform >= 1.0, AWS CLI đã cấu hình.
- **Quick start:** `cp terraform.tfvars.example terraform.tfvars` → sửa `db_password` (nếu `create_rds = true`) hoặc `create_rds = false` và `database_url` → `terraform init` → `terraform plan` → `terraform apply`.
- **Biến quan trọng:** `aws_region`, `enable_nat_gateway`, `create_rds`, `db_password`, `database_url`.
- **Outputs:** `staging_url`, `ecr_frontend_url`, `ecr_backend_url`, `ecs_cluster_name`.
- **Seed DB staging:** Tự chạy trong pipeline khi push `main` (step "Seed database"). User demo: `demo@example.com` / `demo123`, Admin: `admin@example.com` / `admin123`. Prod: chạy workflow **Seed Prod Database** (Actions, một lần).
- **State:** Mặc định local; muốn S3 thì bỏ comment block `backend "s3"` trong `provider.tf`.

### Điều kiện — Terraform Production

Thư mục **terraform-prod/**: infrastructure production (VPC, ECR, ALB, ECS Fargate, RDS optional). Tách biệt với staging — state riêng, tài nguyên riêng. Region mặc định **ap-southeast-1**.

- **Prerequisites:** Terraform >= 1.0, AWS CLI.
- **Quick start:** `cp terraform.tfvars.example terraform.tfvars` → sửa `db_password`, **bắt buộc đổi** `jwt_secret`, `admin_jwt_secret` khác staging → (nếu S3) bỏ comment `backend "s3"`, key `prod/terraform.tfstate` — **phải khác** staging → `terraform init` → `terraform plan` → `terraform apply`.
- **Biến quan trọng:** `vpc_cidr` (mặc định `10.1.0.0/16`), `create_rds`, `db_password`, `ecr_frontend_name`, `ecr_backend_name`.
- **Outputs:** `prod_url`, `ecr_frontend_url`, `ecr_backend_url`, `ecs_cluster_name`.

### GitHub — Staging repo

**Secrets:** `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ACCOUNT_ID`, `PROD_REPO_TOKEN` (PAT có quyền push prod repo).

**Variables:** `AWS_REGION` = `ap-southeast-1`, `ECR_FRONTEND_STAGING`, `ECR_BACKEND_STAGING`, `ECS_CLUSTER_STAGING`, `PROD_REPO_URL` = `https://github.com/<owner>/retail-store-prod`.

**Lấy PROD_REPO_TOKEN:** GitHub → Settings → Developer settings → Personal access tokens → Generate (scope **repo**), thêm vào repo Staging với tên `PROD_REPO_TOKEN`.

### GitHub — Repo Prod

Secrets: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ACCOUNT_ID`. Variables: `AWS_REGION` = `ap-southeast-1`, `ECR_FRONTEND_PROD` = `retail-store-frontend-prod`, `ECR_BACKEND_PROD` = `retail-store-backend-prod`, `ECS_CLUSTER_PROD` = `retail-prod`. Copy `.github/workflows/examples/deploy-prod.yml.example` vào Prod thành `.github/workflows/deploy-prod.yml`; tương tự rollback từ `rollback-prod.yml.example`.

### Setup GitHub từ đầu (2 repo)

1. **Repo Staging:** New repo `Retail-Store` (private), push code. **Repo Prod:** New repo `retail-store-prod` (private).
2. Terraform Staging: `cd terraform-staging`, cấu hình `terraform.tfvars`, `terraform apply`.
3. Repo Staging: thêm Secrets/Variables như trên. Push/merge `main` → Deploy to Staging chạy tự động.
4. Promote: Staging → Actions → Promote to Prod Repo (manual). Prod → cấu hình Secrets/Variables → copy workflow deploy-prod → Actions → Deploy to Prod (manual).

### Workflows trong repo này

- **CI** (`.github/workflows/ci.yml`): push/PR lên `main` hoặc `develop` — lint frontend.
- **Deploy to Staging** (`.github/workflows/deploy-staging.yml`): push/merge vào `main` — build Docker, push ECR `staging-<sha>` và `staging-latest`, update ECS 6 service staging.
- **Promote to Prod Repo** (`.github/workflows/promote-to-prod.yml`): manual — đẩy `main` sang prod repo.

### Staging URL

Sau deploy: Terraform output `staging_url` hoặc AWS Console → EC2 → Load Balancers → ALB staging → DNS name (hoặc CloudFront domain).

### Docker build local (kiểm tra)

```bash
# Backend
docker build -t retail-backend:test -f backend/Dockerfile backend/
docker run --rm -e SERVICE=main -e PORT=3000 -p 3000:3000 retail-backend:test

# Frontend
docker build -t retail-frontend:test -f frontend/Dockerfile frontend/
docker run --rm -p 8080:80 retail-frontend:test
```

Mở `http://localhost:8080` (frontend); API cần trỏ tới backend (path `/api` qua reverse proxy hoặc CORS).

### File CI/CD & infra đã thêm

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
| `.github/workflows/load-test-prod.yml` | Optional: scheduled/manual k6 load test; cần secret `PROD_URL`. |

**Monitoring & giả lập user (chỉ prod):** xem [MONITORING.md](MONITORING.md).

---

## Backend — Data structure & design

- **Entity:** Category (id, slug, name, description?, sortOrder) 1 — * Product (id, slug, name, description?, categoryId, price, currency, imageUrl, rating, ratingCount, stock, createdAt, updatedAt). 3 category: character, food, animal. Ảnh trong `backend/assets/` đặt tên `{slug}-{category}.png`.
- **Nguồn dữ liệu:** `backend/data/schema/types.ts` (TypeScript types), `backend/data/seed/categories.json`, `backend/data/seed/products.json`.
- **Stack gợi ý:** PostgreSQL (production), Prisma/Drizzle, Express/Fastify, Zod validation, REST JSON.
- **API định hướng:** `GET /api/categories`, `GET /api/products` (query `?categoryId=`, `?page=`, `?pageSize=`), `GET /api/products/:slug`. Cart: `GET/POST/PATCH/DELETE /api/cart` (items + product info); validate productId tồn tại, quantity ≤ stock.
- **Lưu ý:** imageUrl production nên dùng CDN/storage URL; price lưu integer (VND); stock cập nhật khi có order.

