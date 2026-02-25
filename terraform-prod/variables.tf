variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-southeast-1"
}

variable "environment" {
  description = "Environment name (prod)"
  type        = string
  default     = "prod"
}

variable "project_name" {
  description = "Project name prefix for resources"
  type        = string
  default     = "retail-store"
}

variable "vpc_cidr" {
  description = "CIDR for VPC (khác staging để tránh overlap nếu cùng account)"
  type        = string
  default     = "10.1.0.0/16"
}

variable "enable_nat_gateway" {
  description = "Create NAT Gateway for private subnet (cost ~32 USD/month if 24/7)"
  type        = bool
  default     = false
}

variable "create_rds" {
  description = "Create AWS RDS PostgreSQL. Project dùng RDS."
  type        = bool
  default     = true
}

variable "db_password" {
  description = "RDS master password. Bắt buộc khi create_rds = true. Set qua TF_VAR_db_password hoặc terraform.tfvars."
  type        = string
  sensitive   = true
  default     = ""
}

variable "ecr_frontend_name" {
  description = "ECR repository name for frontend"
  type        = string
  default     = "retail-store-frontend-prod"
}

variable "ecr_backend_name" {
  description = "ECR repository name for backend"
  type        = string
  default     = "retail-store-backend-prod"
}

variable "database_url" {
  description = "Chỉ dùng khi create_rds = false (DB ngoài). Khi dùng RDS thì để trống."
  type        = string
  sensitive   = true
  default     = ""
}

variable "jwt_secret" {
  description = "JWT secret for auth service"
  type        = string
  sensitive   = true
  default     = ""
}

variable "admin_jwt_secret" {
  description = "Admin JWT secret"
  type        = string
  sensitive   = true
  default     = ""
}

# MONITORING: mật khẩu đăng nhập Grafana (UI tại /grafana)
variable "grafana_admin_password" {
  description = "Grafana admin password (observability)"
  type        = string
  sensitive   = true
  default     = ""
}
