# Cost estimate — Retail Store (prod)

Ước tính chi phí AWS khi chạy stack **24/7** như cấu hình hiện tại trong `terraform-prod/`.  
Region: **ap-southeast-1** (Singapore).

---

## Hạ tầng đang dùng


| Thành phần          | Số lượng                                                             | Ghi chú                                        |
| ------------------- | -------------------------------------------------------------------- | ---------------------------------------------- |
| **ECS Fargate**     | 1 frontend + 5 backend + 3 observability (Prometheus, Grafana, Loki) | Mỗi task: 0.25 vCPU, 512 MB                    |
| **ALB**             | 1                                                                    | Application Load Balancer                      |
| **RDS**             | 1                                                                    | db.t3.micro, 20 GB (`create_rds = true`)       |
| **CloudWatch Logs** | 10 log groups, retention 7 ngày                                      | frontend, 5 backend, prometheus, grafana, loki |
| **ECR**             | 3 repo (frontend, backend, grafana)                                  |                                                |
| **Cloud Map**       | 1 namespace, 8 service (service discovery)                           |                                                |
| **NAT Gateway**     | 0                                                                    | `enable_nat_gateway = false`                   |


---

## Ước tính theo tháng (730 giờ)


| Hạng mục            | Cách tính                                                                           | Khoảng (USD/tháng) |
| ------------------- | ----------------------------------------------------------------------------------- | ------------------ |
| **ECS Fargate**     | 9 task × (0.25 vCPU, 0.5 GB). ap-southeast-1 ~0.04048 USD/vCPU-h, ~0.00445 USD/GB-h | **80–85**          |
| **ALB**             | 1 ALB, LCU thấp (~1–2 LCU), ~0.0225 USD/LCU-h                                       | **18–25**          |
| **RDS**             | db.t3.micro ~0.017 USD/h + 20 GB gp2 ~0.115 USD/GB-tháng                            | **14–15**          |
| **CloudWatch Logs** | Ingestion ~0.50 USD/GB; ~1.5–2 GB/ngày (nhiều container) → ~45–60 GB/tháng          | **25–35**          |
| **ECR**             | 3 repo, ~2–3 GB storage, ~0.10 USD/GB-tháng                                         | **0.5–1**          |
| **Cloud Map**       | 1 namespace (~0.50 USD), request ít                                                 | **0.5–1**          |
| **Data transfer**   | Cùng region, không NAT, outbound ít                                                 | **0–2**            |


---

## Tổng ước tính

- **Khoảng: 145–165 USD/tháng** (trung bình ~155 USD/tháng).

Giảm log (ít stream, ít deploy) có thể đưa CloudWatch xuống ~15–20 USD → tổng **~135–150 USD/tháng**.
