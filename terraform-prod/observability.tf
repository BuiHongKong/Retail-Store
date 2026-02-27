# -----------------------------------------------------------------------------
# MONITORING — Observability stack (production only)
# -----------------------------------------------------------------------------
# Deploy Grafana, Prometheus, Loki trên ECS Fargate trong VPC prod.
# - Grafana: UI tại ALB path /grafana, datasource Prometheus đã cấu hình.
# - Prometheus: scrape GET /metrics của từng backend (main, cart, checkout, auth, admin) qua service discovery.
# - Loki: lưu log; có thể thêm làm datasource trong Grafana.
# Cần: service_discovery.tf (namespace + backend + prometheus), ECS backend có service_registries.
# Chi tiết: MONITORING.md
# -----------------------------------------------------------------------------
module "observability" {
  source = "./modules/observability"

  project_name  = var.project_name
  environment   = var.environment
  aws_region    = var.aws_region
  vpc_id        = aws_vpc.main.id
  subnet_ids    = local.ecs_subnet_ids
  alb_arn       = aws_lb.main.arn
  listener_arn  = aws_lb_listener.http.arn

  ecs_execution_role_arn = aws_iam_role.ecs_execution.arn
  ecs_task_role_arn      = aws_iam_role.ecs_task.arn
  alb_security_group_id  = aws_security_group.alb.id
  ecs_security_group_id  = aws_security_group.ecs.id

  service_discovery_namespace_id   = aws_service_discovery_private_dns_namespace.main.id
  service_discovery_namespace_name = aws_service_discovery_private_dns_namespace.main.name
  prometheus_service_discovery_arn = aws_service_discovery_service.prometheus.arn
  loki_service_discovery_arn       = aws_service_discovery_service.loki.arn
  backend_services                = [for s in local.ecs_backend_services : { name = s.name, port = s.port }]

  grafana_admin_password = var.grafana_admin_password
  enable_grafana_alb     = true
  grafana_image          = var.build_grafana_image ? "${aws_ecr_repository.grafana.repository_url}:latest" : "grafana/grafana:latest"

  depends_on = var.build_grafana_image ? [null_resource.grafana_build[0]] : []
}

# Allow Prometheus (observability SG) to scrape app ECS on ports 3000-3004
resource "aws_security_group_rule" "ecs_allow_observability_scrape" {
  type                     = "ingress"
  from_port                = 3000
  to_port                  = 3004
  protocol                 = "tcp"
  security_group_id        = aws_security_group.ecs.id
  source_security_group_id = module.observability.observability_security_group_id
  description              = "Prometheus scrape app /metrics"
}
