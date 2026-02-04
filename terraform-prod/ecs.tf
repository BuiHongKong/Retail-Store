locals {
  ecs_subnet_ids = var.enable_nat_gateway ? aws_subnet.private[*].id : aws_subnet.public[*].id
}

resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-${var.environment}"
  tags = {
    Name = "${var.project_name}-${var.environment}"
  }
}

# Task execution role (ECR pull, CloudWatch logs)
data "aws_iam_policy_document" "ecs_execution" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "ecs_execution" {
  name               = "${var.project_name}-${var.environment}-ecs-execution"
  assume_role_policy = data.aws_iam_policy_document.ecs_execution.json
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Task role (for app; optional)
resource "aws_iam_role" "ecs_task" {
  name               = "${var.project_name}-${var.environment}-ecs-task"
  assume_role_policy = data.aws_iam_policy_document.ecs_execution.json
}

data "aws_caller_identity" "current" {}
locals {
  account_id    = data.aws_caller_identity.current.account_id
  ecr_frontend_url = "${local.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/${aws_ecr_repository.frontend.name}"
  ecr_backend_url  = "${local.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/${aws_ecr_repository.backend.name}"
  image_tag     = "prod-latest"
}

# Frontend task definition
resource "aws_ecs_task_definition" "frontend" {
  family                   = "${var.project_name}-${var.environment}-frontend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn
  container_definitions = jsonencode([{
    name  = "frontend"
    image = "${local.ecr_frontend_url}:${local.image_tag}"
    portMappings = [{ containerPort = 80, protocol = "tcp" }]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/${var.project_name}-${var.environment}-frontend"
        "awslogs-region"        = var.aws_region
        "awslogs-create-group"  = "true"
      }
    }
    healthCheck = {
      command     = ["CMD-SHELL", "curl -f http://localhost/health || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 60
    }
  }])
}

# Backend task definition (one per service: env SERVICE + PORT)
locals {
  ecs_backend_services = [
    { name = "main", port = 3000, env = [{ name = "SERVICE", value = "main" }, { name = "PORT", value = "3000" }] },
    { name = "cart", port = 3001, env = [{ name = "SERVICE", value = "cart" }, { name = "CART_PORT", value = "3001" }] },
    { name = "checkout", port = 3002, env = [{ name = "SERVICE", value = "checkout" }, { name = "CHECKOUT_PORT", value = "3002" }] },
    { name = "auth", port = 3003, env = [{ name = "SERVICE", value = "auth" }, { name = "AUTH_PORT", value = "3003" }] },
    { name = "admin", port = 3004, env = [{ name = "SERVICE", value = "admin" }, { name = "ADMIN_PORT", value = "3004" }] },
  ]
}

resource "aws_ecs_task_definition" "backend" {
  for_each                 = { for s in local.ecs_backend_services : s.name => s }
  family                   = "${var.project_name}-${var.environment}-${each.value.name}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn
  container_definitions = jsonencode([{
    name  = each.value.name
    image = "${local.ecr_backend_url}:${local.image_tag}"
    portMappings = [{ containerPort = each.value.port, protocol = "tcp" }]
    environment = concat(
      each.value.env,
      local.database_url != "" ? [{ name = "DATABASE_URL", value = local.database_url }] : [],
      [
        { name = "JWT_SECRET", value = var.jwt_secret },
        { name = "ADMIN_JWT_SECRET", value = var.admin_jwt_secret }
      ]
    )
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/${var.project_name}-${var.environment}-${each.value.name}"
        "awslogs-region"        = var.aws_region
        "awslogs-create-group"  = "true"
      }
    }
  }])
}

# ECS Services
resource "aws_ecs_service" "frontend" {
  name            = "frontend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.frontend.arn
  desired_count   = 1
  launch_type     = "FARGATE"
  network_configuration {
    subnets          = local.ecs_subnet_ids
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = !var.enable_nat_gateway
  }
  load_balancer {
    target_group_arn = aws_lb_target_group.frontend.arn
    container_name  = "frontend"
    container_port  = 80
  }
  tags = {
    Name = "${var.project_name}-${var.environment}-frontend"
  }
}

resource "aws_ecs_service" "backend" {
  for_each        = { for s in local.ecs_backend_services : s.name => s }
  name            = each.value.name
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend[each.value.name].arn
  desired_count   = 1
  launch_type     = "FARGATE"
  network_configuration {
    subnets          = local.ecs_subnet_ids
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = !var.enable_nat_gateway
  }
  load_balancer {
    target_group_arn = aws_lb_target_group.backend[each.value.name].arn
    container_name   = each.value.name
    container_port    = each.value.port
  }
  tags = {
    Name = "${var.project_name}-${var.environment}-${each.value.name}"
  }
}
