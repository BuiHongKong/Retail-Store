# Promtail: read app log file and push to Loki. Injected per task (service name).
server:
  http_listen_port: 9080
  grpc_listen_port: 0
positions:
  filename: /tmp/positions.yaml
clients:
  - url: ${loki_url}/loki/api/v1/push
scrape_configs:
  - job_name: backend
    static_configs:
      - targets:
          - localhost
        labels:
          job: backend
          service: ${service_name}
          __path__: /var/log/app/*.log
