# Build and push custom Grafana image (grafana:latest + provisioned dashboards).
# Requires: Docker and AWS CLI on the machine running terraform apply.
# Uses data.aws_caller_identity.current from ecs.tf.
# -----------------------------------------------------------------------------
locals {
  grafana_registry = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com"
}

resource "null_resource" "grafana_build" {
  triggers = {
    dockerfile      = filemd5("${path.module}/modules/observability/grafana/Dockerfile")
    dashboards      = filemd5("${path.module}/modules/observability/grafana/provisioning/dashboards/dashboards.yaml")
    dashboard_json  = filemd5("${path.module}/modules/observability/grafana/provisioning/dashboards/json/retail-store-app.json")
  }
  provisioner "local-exec" {
    command = <<-EOT
      set -e
      aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin ${local.grafana_registry}
      docker build -t ${aws_ecr_repository.grafana.repository_url}:latest -f ${path.module}/modules/observability/grafana/Dockerfile ${path.module}/modules/observability/grafana
      docker push ${aws_ecr_repository.grafana.repository_url}:latest
    EOT
    interpreter = ["bash", "-c"]
  }
}
