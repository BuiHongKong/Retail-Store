# -----------------------------------------------------------------------------
# MONITORING — Service discovery cho Prometheus (production only)
# -----------------------------------------------------------------------------
# Private DNS namespace "retail-store.local" trong VPC prod. Mỗi ECS backend service
# đăng ký tên (main, cart, checkout, auth, admin) → Prometheus resolve main.retail-store.local:3000
# để scrape GET /metrics. Prometheus cũng đăng ký → Grafana resolve prometheus.retail-store.local:9090.
# ECS task definition backend cần block service_registries (xem ecs.tf).
# -----------------------------------------------------------------------------
resource "aws_service_discovery_private_dns_namespace" "main" {
  name        = "retail-store.local"
  vpc         = aws_vpc.main.id
  description = "Private DNS namespace for ECS service discovery"
}

resource "aws_service_discovery_service" "backend" {
  for_each = { for s in local.ecs_backend_services : s.name => s }
  name    = each.value.name
  dns_config {
    namespace_id   = aws_service_discovery_private_dns_namespace.main.id
    dns_records {
      ttl  = 10
      type = "A"
    }
    routing_policy = "MULTIVALUE"
  }
  health_check_custom_config {
    failure_threshold = 1
  }
}

# Prometheus discovery so Grafana can reach Prometheus at prometheus.retail-store.local
resource "aws_service_discovery_service" "prometheus" {
  name   = "prometheus"
  dns_config {
    namespace_id   = aws_service_discovery_private_dns_namespace.main.id
    dns_records {
      ttl  = 10
      type = "A"
    }
    routing_policy = "MULTIVALUE"
  }
  health_check_custom_config {
    failure_threshold = 1
  }
}
