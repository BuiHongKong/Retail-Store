# Terraform — Staging (ap-southeast-1)

Infrastructure cho môi trường staging: VPC, ECR, ALB, ECS Fargate, RDS (optional).

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
2. Sửa `terraform.tfvars`: đặt `db_password` (nếu `create_rds = true`), hoặc `create_rds = false` và `database_url` nếu dùng Neon/Supabase.
3. Init và apply:
   ```bash
   terraform init
   terraform plan
   terraform apply
   ```
4. Sau khi apply: lấy **staging_url** từ output (`terraform output staging_url`). Cấu hình GitHub Secrets/Variables theo [docs/STAGING_PROD.md](../docs/STAGING_PROD.md) (AWS_ACCOUNT_ID, ECS cluster name, v.v.).
5. **Seed DB (một lần)**: Chạy `.\run-seed-once.ps1` trong `terraform-staging/` để tạo user demo (`demo@example.com` / `demo123`) và admin (`admin@example.com` / `admin123`). Sau đó không cần chạy lại.

## Biến quan trọng

| Variable | Mô tả |
|----------|--------|
| `aws_region` | Region AWS (mặc định ap-southeast-1) |
| `enable_nat_gateway` | `true` = ECS trong private subnet, cần NAT (~32 USD/tháng). `false` = ECS public subnet, không NAT. |
| `create_rds` | `true` = tạo RDS PostgreSQL. `false` = dùng DB ngoài (set `database_url`). |
| `db_password` | Mật khẩu RDS (bắt buộc nếu create_rds = true). |
| `database_url` | Connection string DB (bắt buộc nếu create_rds = false). |

## Outputs

- `staging_url`: URL truy cập staging (http://ALB_DNS)
- `ecr_frontend_url`, `ecr_backend_url`: Để push image từ GitHub Actions
- `ecs_cluster_name`: Tên cluster (vd retail-staging) — khớp với GitHub vars

## State

Mặc định state lưu local. Để dùng S3 (team): bỏ comment block `backend "s3"` trong `provider.tf`, tạo bucket và DynamoDB table, rồi `terraform init -reconfigure`.
