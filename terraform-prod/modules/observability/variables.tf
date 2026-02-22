# -----------------------------------------------------------------------------
# MONITORING — Biến cho module observability (Grafana, Prometheus, Loki)
# -----------------------------------------------------------------------------
variable "project_name" {
  type    = string
  default = "retail-store"
}

variable "environment" {
  type    = string
  default = "prod"
}

variable "aws_region" {
  type    = string
  default = "ap-southeast-1"
}

variable "vpc_id" {
  type = string
}

variable "subnet_ids" {
  type = list(string)
}

variable "alb_arn" {
  type = string
}

variable "listener_arn" {
  type = string
}

variable "ecs_execution_role_arn" {
  type = string
}

variable "ecs_task_role_arn" {
  type = string
}

variable "alb_security_group_id" {
  type = string
}

variable "ecs_security_group_id" {
  description = "App ECS SG - observability SG will need to be allowed to scrape this"
  type        = string
}

variable "service_discovery_namespace_id" {
  type = string
}

variable "service_discovery_namespace_name" {
  description = "e.g. retail-store.local - used for Prometheus scrape DNS"
  type        = string
}

variable "backend_services" {
  description = "List of {name, port} for Prometheus scrape"
  type = list(object({
    name = string
    port = number
  }))
  default = [
    { name = "main", port = 3000 },
    { name = "cart", port = 3001 },
    { name = "checkout", port = 3002 },
    { name = "auth", port = 3003 },
    { name = "admin", port = 3004 }
  ]
}

variable "grafana_admin_password" {
  type      = string
  sensitive = true
  default   = "admin"
}

variable "enable_grafana_alb" {
  description = "Expose Grafana via ALB path /grafana"
  type        = bool
  default     = true
}

variable "prometheus_service_discovery_arn" {
  description = "Service discovery registry ARN for Prometheus (so Grafana can resolve prometheus.namespace)"
  type        = string
  default     = ""
}
