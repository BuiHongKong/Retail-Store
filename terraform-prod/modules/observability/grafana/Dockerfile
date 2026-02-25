# Grafana with pre-provisioned dashboards (Prometheus + Loki)
FROM grafana/grafana:latest

USER root
COPY provisioning/dashboards /etc/grafana/provisioning/dashboards
RUN chown -R 472:472 /etc/grafana/provisioning/dashboards
USER 472
