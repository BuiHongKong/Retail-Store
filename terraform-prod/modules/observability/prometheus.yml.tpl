# -----------------------------------------------------------------------------
# MONITORING — Cấu hình scrape của Prometheus (template, inject vào container)
# -----------------------------------------------------------------------------
# DNS: <svc>.retail-store.local (A record từ ECS service discovery). Mỗi backend
# expose GET /metrics (prom-client). Các metric business: auth_logins_total (auth),
# product_sales_total, checkout_payments_total (checkout). Kiểm tra: Prometheus
# UI → Status → Targets (main,cart,checkout,auth,admin phải UP).
# -----------------------------------------------------------------------------
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
%{for svc in backend_services ~}
  - job_name: '${svc.name}'
    dns_sd_configs:
      - names:
          - '${svc.name}.${namespace_name}'
        type: 'A'
        port: ${svc.port}
        refresh_interval: 15s
    metrics_path: /metrics
    scheme: http
    scrape_interval: 15s
    scrape_timeout: 10s
    # instance = <resolved_ip>:port; job = ${svc.name} (dùng trong Grafana by (job))
%{endfor ~}
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
