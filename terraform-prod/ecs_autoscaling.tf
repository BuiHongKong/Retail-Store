# ECS Application Auto Scaling — Target tracking on CPU (70%)
# Prod: frontend + main/cart/checkout scale 1–6; auth/admin 1–2

locals {
  # Services that can scale higher under load
  ecs_autoscale_high = { for s in local.ecs_backend_services : s.name => s if contains(["main", "cart", "checkout"], s.name) }
  # Auth and admin: lower max to save cost
  ecs_autoscale_low = { for s in local.ecs_backend_services : s.name => s if contains(["auth", "admin"], s.name) }
}

resource "aws_appautoscaling_target" "frontend" {
  max_capacity       = 6
  min_capacity       = 1
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.frontend.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "frontend_cpu" {
  name               = "${var.project_name}-${var.environment}-frontend-cpu"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.frontend.resource_id
  scalable_dimension = aws_appautoscaling_target.frontend.scalable_dimension
  service_namespace  = aws_appautoscaling_target.frontend.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 70.0
    scale_in_cooldown  = 180
    scale_out_cooldown = 60
  }
}

# Backend: main, cart, checkout — max 6
resource "aws_appautoscaling_target" "backend_high" {
  for_each           = local.ecs_autoscale_high
  max_capacity       = 6
  min_capacity       = 1
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.backend[each.value.name].name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "backend_high_cpu" {
  for_each           = local.ecs_autoscale_high
  name               = "${var.project_name}-${var.environment}-${each.value.name}-cpu"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.backend_high[each.value.name].resource_id
  scalable_dimension = aws_appautoscaling_target.backend_high[each.value.name].scalable_dimension
  service_namespace  = aws_appautoscaling_target.backend_high[each.value.name].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 70.0
    scale_in_cooldown  = 180
    scale_out_cooldown = 60
  }
}

# Backend: auth, admin — max 2
resource "aws_appautoscaling_target" "backend_low" {
  for_each           = local.ecs_autoscale_low
  max_capacity       = 2
  min_capacity       = 1
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.backend[each.value.name].name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "backend_low_cpu" {
  for_each           = local.ecs_autoscale_low
  name               = "${var.project_name}-${var.environment}-${each.value.name}-cpu"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.backend_low[each.value.name].resource_id
  scalable_dimension = aws_appautoscaling_target.backend_low[each.value.name].scalable_dimension
  service_namespace  = aws_appautoscaling_target.backend_low[each.value.name].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 70.0
    scale_in_cooldown  = 180
    scale_out_cooldown = 60
  }
}
