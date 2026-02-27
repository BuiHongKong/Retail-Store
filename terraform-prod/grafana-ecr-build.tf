# Build and push custom Grafana image (grafana:latest + provisioned dashboards).
# Requires: Docker and AWS CLI on the machine running terraform apply.
# Uses data.aws_caller_identity.current from ecs.tf.
# -----------------------------------------------------------------------------
locals {
  grafana_registry = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com"
}

resource "null_resource" "grafana_build" {
  triggers = {
    build_enabled     = var.build_grafana_image ? "1" : "0"
    dockerfile        = filemd5("${path.module}/modules/observability/grafana/Dockerfile")
    datasources       = filemd5("${path.module}/modules/observability/grafana/provisioning/datasources/datasources.yaml")
    dashboards        = filemd5("${path.module}/modules/observability/grafana/provisioning/dashboards/dashboards.yaml")
    dashboard_infra   = filemd5("${path.module}/modules/observability/grafana/provisioning/dashboards/json/retail-store-app.json")
    dashboard_business = filemd5("${path.module}/modules/observability/grafana/provisioning/dashboards/json/retail-store-business.json")
  }
  provisioner "local-exec" {
    command = <<-EOT
      set -e
      if [ "${var.build_grafana_image ? "true" : "false"}" != "true" ]; then echo "Skipping Grafana image build (build_grafana_image=false)."; exit 0; fi
      aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin ${local.grafana_registry}
      docker build -t ${aws_ecr_repository.grafana.repository_url}:latest -f ${path.module}/modules/observability/grafana/Dockerfile ${path.module}/modules/observability/grafana
      docker push ${aws_ecr_repository.grafana.repository_url}:latest
    EOT
    interpreter = ["bash", "-c"]
  }
}
