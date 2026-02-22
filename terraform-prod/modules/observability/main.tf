locals {
  name_prefix = "${var.project_name}-${var.environment}-obs"
}

# Security group: observability stack (Grafana, Prometheus, Loki)
resource "aws_security_group" "observability" {
  name_prefix = "${local.name_prefix}-"
  vpc_id      = var.vpc_id
  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [var.alb_security_group_id]
    description     = "Grafana from ALB"
  }
  ingress {
    from_port = 9090
    to_port   = 9090
    protocol  = "tcp"
    self      = true
    description = "Prometheus UI"
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = {
    Name = "${local.name_prefix}-sg"
  }
  lifecycle {
    create_before_destroy = true
  }
}

# CloudWatch log groups
resource "aws_cloudwatch_log_group" "prometheus" {
  name              = "/ecs/${local.name_prefix}-prometheus"
  retention_in_days = 7
}

resource "aws_cloudwatch_log_group" "grafana" {
  name              = "/ecs/${local.name_prefix}-grafana"
  retention_in_days = 7
}

resource "aws_cloudwatch_log_group" "loki" {
  name              = "/ecs/${local.name_prefix}-loki"
  retention_in_days = 7
}

# Prometheus config as base64 env (no custom image)
locals {
  prometheus_config_yml = templatefile("${path.module}/prometheus.yml.tpl", {
    backend_services = var.backend_services
    namespace_name  = var.service_discovery_namespace_name
  })
  prometheus_config_b64 = base64encode(local.prometheus_config_yml)
}

# Prometheus task definition
resource "aws_ecs_task_definition" "prometheus" {
  family                   = "${local.name_prefix}-prometheus"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = var.ecs_execution_role_arn
  task_role_arn            = var.ecs_task_role_arn
  container_definitions = jsonencode([{
    name  = "prometheus"
    image = "prom/prometheus:v2.47.0"
    portMappings = [{ containerPort = 9090, protocol = "tcp" }]
    environment = [
      { name = "PROMETHEUS_CONFIG_B64", value = local.prometheus_config_b64 }
    ]
    command = [
      "sh", "-c",
      "echo \"$PROMETHEUS_CONFIG_B64\" | base64 -d > /etc/prometheus/prometheus.yml && exec /bin/prometheus --config.file=/etc/prometheus/prometheus.yml --storage.tsdb.path=/prometheus --web.enable-lifecycle"
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.prometheus.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "prometheus"
      }
    }
  }])
}

# Grafana task definition (Prometheus URL via service discovery)
locals {
  prometheus_url = "http://prometheus.${var.service_discovery_namespace_name}:9090"
}

resource "aws_ecs_task_definition" "grafana" {
  family                   = "${local.name_prefix}-grafana"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = var.ecs_execution_role_arn
  task_role_arn            = var.ecs_task_role_arn
  container_definitions = jsonencode([{
    name  = "grafana"
    image = "grafana/grafana:10.2.0"
    portMappings = [{ containerPort = 3000, protocol = "tcp" }]
    environment = [
      { name = "GF_SECURITY_ADMIN_PASSWORD", value = var.grafana_admin_password },
      { name = "GF_SERVER_ROOT_URL", value = "/grafana" },
      { name = "GF_SERVER_SERVE_FROM_SUB_PATH", value = "true" },
      { name = "GF_USERS_ALLOW_SIGN_UP", value = "false" },
      { name = "GF_DATASOURCES_DEFAULT_NAME", value = "Prometheus" },
      { name = "GF_DATASOURCES_DEFAULT_TYPE", value = "prometheus" },
      { name = "GF_DATASOURCES_DEFAULT_URL", value = local.prometheus_url }
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.grafana.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "grafana"
      }
    }
  }])
}

# Loki task definition (minimal config)
resource "aws_ecs_task_definition" "loki" {
  family                   = "${local.name_prefix}-loki"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = var.ecs_execution_role_arn
  task_role_arn            = var.ecs_task_role_arn
  container_definitions = jsonencode([{
    name  = "loki"
    image = "grafana/loki:2.9.0"
    portMappings = [{ containerPort = 3100, protocol = "tcp" }]
    command = ["-config.file=/etc/loki/local-config.yaml"]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.loki.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "loki"
      }
    }
  }])
}

# ECS cluster for observability (dedicated to avoid mixing with app)
resource "aws_ecs_cluster" "observability" {
  name = "${local.name_prefix}"
  tags = {
    Name = "${local.name_prefix}"
  }
}

# Prometheus service (no ALB); register in service discovery for Grafana
resource "aws_ecs_service" "prometheus" {
  name            = "prometheus"
  cluster         = aws_ecs_cluster.observability.id
  task_definition = aws_ecs_task_definition.prometheus.arn
  desired_count   = 1
  launch_type     = "FARGATE"
  network_configuration {
    subnets          = var.subnet_ids
    security_groups  = [aws_security_group.observability.id]
    assign_public_ip = true
  }
  dynamic "service_registries" {
    for_each = var.prometheus_service_discovery_arn != "" ? [1] : []
    content {
      registry_arn = var.prometheus_service_discovery_arn
    }
  }
  tags = {
    Name = "${local.name_prefix}-prometheus"
  }
}

# Loki service (no ALB)
resource "aws_ecs_service" "loki" {
  name            = "loki"
  cluster         = aws_ecs_cluster.observability.id
  task_definition = aws_ecs_task_definition.loki.arn
  desired_count   = 1
  launch_type     = "FARGATE"
  network_configuration {
    subnets          = var.subnet_ids
    security_groups  = [aws_security_group.observability.id]
    assign_public_ip = true
  }
  tags = {
    Name = "${local.name_prefix}-loki"
  }
}

# Grafana: ALB target group + service (when enable_grafana_alb)
resource "aws_lb_target_group" "grafana" {
  count       = var.enable_grafana_alb ? 1 : 0
  name        = "${local.name_prefix}-grafana"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"
  health_check {
    path                = "/grafana/api/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
  }
  tags = {
    Name = "${local.name_prefix}-grafana"
  }
}

resource "aws_ecs_service" "grafana" {
  name            = "grafana"
  cluster         = aws_ecs_cluster.observability.id
  task_definition = aws_ecs_task_definition.grafana.arn
  desired_count   = 1
  launch_type     = "FARGATE"
  network_configuration {
    subnets          = var.subnet_ids
    security_groups  = [aws_security_group.observability.id]
    assign_public_ip = true
  }
  dynamic "load_balancer" {
    for_each = var.enable_grafana_alb ? [1] : []
    content {
      target_group_arn = aws_lb_target_group.grafana[0].arn
      container_name   = "grafana"
      container_port   = 3000
    }
  }
  tags = {
    Name = "${local.name_prefix}-grafana"
  }
}

# ALB listener rule: /grafana -> Grafana
resource "aws_lb_listener_rule" "grafana" {
  count        = var.enable_grafana_alb ? 1 : 0
  listener_arn = var.listener_arn
  priority     = 5
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.grafana[0].arn
  }
  condition {
    path_pattern {
      values = ["/grafana", "/grafana/*"]
    }
  }
}
