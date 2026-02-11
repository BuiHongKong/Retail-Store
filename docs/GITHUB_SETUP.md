# Hướng dẫn Setup GitHub — Retail Store

---

## 1. Tạo 2 repo

### 1.1 Repo Staging (Retail-Store)

1. GitHub → New repository.
2. Name: `Retail-Store`. Private. Không thêm README, .gitignore, license.
3. Create repository.
4. Local: `git remote add origin https://github.com/<owner>/Retail-Store.git` → `git push -u origin main`.

### 1.2 Repo Prod (Retail-Store-prod)

1. GitHub → New repository.
2. Name: `Retail-Store-prod`. Private. Không thêm README, .gitignore, license.
3. Create repository. Ví dụ: https://github.com/BuiHongKong/Retail-Store-prod

---

## 2. Database (AWS)

AWS RDS PostgreSQL 15. Terraform tạo khi apply (`create_rds = true`, `db_password` trong `terraform.tfvars`).

---

## 3. Repo Staging — Secrets

Settings → Secrets and variables → Actions.

| Secret |
|--------|
| `AWS_ACCESS_KEY_ID` |
| `AWS_SECRET_ACCESS_KEY` |
| `AWS_ACCOUNT_ID` |

---

## 4. Repo Staging — Variables

| Variable | Giá trị |
|----------|---------|
| `AWS_REGION` | `ap-southeast-1` |
| `ECR_FRONTEND_STAGING` | `retail-store-frontend-staging` |
| `ECR_BACKEND_STAGING` | `retail-store-backend-staging` |
| `ECS_CLUSTER_STAGING` | `retail-staging` |
| `ECR_FRONTEND_PROD` | `retail-store-frontend-prod` (cho job deploy prod trong staging) |
| `ECR_BACKEND_PROD` | `retail-store-backend-prod` |
| `ECS_CLUSTER_PROD` | `retail-store-prod` |

---

## 5. Terraform Staging

```bash
cd terraform-staging
cp terraform.tfvars.example terraform.tfvars
# Sửa terraform.tfvars: db_password
terraform init
terraform apply
```

---

## 6. Deploy Staging

Push/merge vào `main` → Deploy to Staging chạy tự động.

---

## 7. Promote to Prod

### 7.1 Terraform Prod

```bash
cd terraform-prod
cp terraform.tfvars.example terraform.tfvars
# Sửa terraform.tfvars: db_password, jwt_secret, admin_jwt_secret
terraform init
terraform apply
```

### 7.2 Repo Prod — Secrets và Variables

Secrets: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ACCOUNT_ID`

Variables: `AWS_REGION` = `ap-southeast-1`, `ECR_FRONTEND_PROD` = `retail-store-frontend-prod`, `ECR_BACKEND_PROD` = `retail-store-backend-prod`, `ECS_CLUSTER_PROD` = `retail-store-prod`

### 7.3 Repo Prod — Workflow

Copy `.github/workflows/for-prod-repo/rollback-prod.yml.example` từ Staging vào Prod thành `.github/workflows/rollback-prod.yml`. Commit, push. (Deploy prod chạy từ Staging repo sau khi Approve environment \`prod\`.)

### 7.4 Thực hiện

1. Staging: Push/merge \`main\` → deploy staging chạy → Approve environment \`prod\` → deploy prod chạy.
2. Khi cần rollback: Prod repo → Actions → Rollback Prod → Run workflow.
