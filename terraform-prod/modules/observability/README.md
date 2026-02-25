# Observability module (Grafana, Prometheus, Loki) — Production

- **Grafana:** ALB path `/grafana`, admin password from variable `grafana_admin_password`. Default Prometheus datasource is configured via env (prometheus.retail-store.local:9090).
- **Prometheus:** Scrapes app services via service discovery (main, cart, checkout, auth, admin) on path `/metrics`. No UI exposed on ALB.
- **Loki:** Runs in the same cluster, registered in service discovery as `loki.retail-store.local:3100`. Grafana has Loki pre-configured as datasource (env `GF_DATASOURCES_1_*`). When ECS logs are shipped to Loki (e.g. Lambda or Fluent Bit), they will show in Grafana Explore.

## Dashboard

Import the pre-built dashboard in Grafana: **Dashboards → Import → Upload JSON file** and select `grafana-dashboard.json` from this folder. It shows request rate, duration (p50/p99), 5xx rate, and total requests by service (job).
