variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-southeast-1"
}

variable "environment" {
  description = "Environment name (staging, prod)"
  type        = string
  default     = "staging"
}

variable "project_name" {
  description = "Project name prefix for resources"
  type        = string
  default     = "retail-store"
}

variable "vpc_cidr" {
  description = "CIDR for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "enable_nat_gateway" {
  description = "Create NAT Gateway for private subnet (cost ~32 USD/month if 24/7)"
  type        = bool
  default     = false
}

variable "create_rds" {
  description = "Create RDS PostgreSQL (set false to use external DB e.g. Neon)"
  type        = bool
  default     = true
}

variable "db_password" {
  description = "RDS master password (set via TF_VAR_db_password or -var). Required if create_rds = true."
  type        = string
  sensitive   = true
  default     = ""
}

variable "ecr_frontend_name" {
  description = "ECR repository name for frontend"
  type        = string
  default     = "retail-store-frontend-staging"
}

variable "ecr_backend_name" {
  description = "ECR repository name for backend"
  type        = string
  default     = "retail-store-backend-staging"
}

variable "database_url" {
  description = "Override DATABASE_URL for backend (if not using RDS, e.g. Neon). Leave empty when create_rds = true."
  type        = string
  sensitive   = true
  default     = ""
}

variable "jwt_secret" {
  description = "JWT secret for auth service"
  type        = string
  sensitive   = true
  default     = "change-me-in-production"
}

variable "admin_jwt_secret" {
  description = "Admin JWT secret"
  type        = string
  sensitive   = true
  default     = "change-me-in-production"
}
