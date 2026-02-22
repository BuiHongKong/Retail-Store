output "observability_security_group_id" {
  value = aws_security_group.observability.id
}

output "observability_cluster_name" {
  value = aws_ecs_cluster.observability.name
}

output "grafana_url_path" {
  value = var.enable_grafana_alb ? "/grafana" : null
}

output "prometheus_task_definition_arn" {
  value = aws_ecs_task_definition.prometheus.arn
}
