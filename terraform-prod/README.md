# Terraform — Production (ap-southeast-1)

Infrastructure cho môi trường **production**: VPC, ECR, ALB, ECS Fargate, RDS (optional).

Tách biệt hoàn toàn với `terraform/` (staging). State riêng, tài nguyên riêng.

## Region

Mặc định **ap-southeast-1** (Singapore). Đổi trong `variables.tf` hoặc `terraform.tfvars`.

## Prerequisites

- [Terraform](https://www.terraform.io/downloads) >= 1.0
- AWS CLI đã cấu hình (hoặc env `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)

## Quick start

1. Copy biến mẫu:
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```
2. Sửa `terraform.tfvars`:
   - Đặt `db_password` (nếu `create_rds = true`)
   - Hoặc `create_rds = false` và `database_url` nếu dùng Neon/Supabase
   - **Bắt buộc đổi** `jwt_secret`, `admin_jwt_secret` khác staging
3. (Nếu dùng S3 backend) Bỏ comment block `backend "s3"` trong `provider.tf`, đổi `key = "prod/terraform.tfstate"` — **phải khác** key của staging để tách state.
4. Init và apply:
   ```bash
   terraform init
   terraform plan
   terraform apply
   ```
5. Sau khi apply: lấy **prod_url** từ output (`terraform output prod_url`). Cấu hình GitHub Secrets/Variables trong **repo Prod** theo [docs/GITHUB_SETUP.md](../docs/GITHUB_SETUP.md).

## Biến quan trọng

| Variable | Mô tả |
|----------|--------|
| `vpc_cidr` | Mặc định `10.1.0.0/16` — khác staging (`10.0.0.0/16`) để tránh overlap khi cùng account |
| `create_rds` | `true` = tạo RDS PostgreSQL. `false` = dùng DB ngoài (set `database_url`). |
| `db_password` | Mật khẩu RDS (bắt buộc nếu create_rds = true). |
| `ecr_frontend_name` | Mặc định `retail-store-frontend-prod` — khớp GitHub vars |
| `ecr_backend_name` | Mặc định `retail-store-backend-prod` — khớp GitHub vars |

## Outputs

- `prod_url`: URL truy cập prod (http://ALB_DNS)
- `ecr_frontend_url`, `ecr_backend_url`: Để push image từ GitHub Actions (repo Prod)
- `ecs_cluster_name`: Tên cluster (vd retail-prod) — khớp với `ECS_CLUSTER_PROD` trong GitHub vars

## State

**Quan trọng:** State prod phải tách với staging.

- **Local:** Chạy từ thư mục `terraform-prod/` — file `terraform.tfstate` nằm trong folder này, không trùng với `terraform/`.
- **S3:** Nếu dùng backend S3, đặt `key = "prod/terraform.tfstate"` (staging dùng `staging/terraform.tfstate`).
