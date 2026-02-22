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
    metrics_path: /metrics
    scrape_interval: 15s

%{endfor ~}
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
