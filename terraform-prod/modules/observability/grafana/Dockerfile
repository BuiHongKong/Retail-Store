# Grafana with pre-provisioned dashboards + datasources (Prometheus + Loki)
FROM grafana/grafana:latest

USER root
COPY provisioning/datasources /etc/grafana/provisioning/datasources
COPY provisioning/dashboards /etc/grafana/provisioning/dashboards
RUN chown -R 472:472 /etc/grafana/provisioning
USER 472
