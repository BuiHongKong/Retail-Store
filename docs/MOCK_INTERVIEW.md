# Mock Interview - Plush Haven (Infra Focus)

Dùng file này để luyện phỏng vấn kỹ thuật theo hướng **hạ tầng và vận hành**.  
Định dạng gợi ý cho mỗi câu:

- trả lời nói trong 60-120 giây
- bám vào decision, trade-off, risk
- kết thúc bằng "next infra improvement"

---

## Giới thiệu nhanh (30-45s)

Prompt:
"Tóm tắt project của bạn theo góc nhìn infrastructure và operations."

Gợi ý trả lời:

- Mình triển khai hệ thống trên AWS bằng Terraform: VPC, ALB, ECS Fargate services, RDS PostgreSQL, ECR và observability stack.
- Traffic vào ALB được route theo path tới frontend và 5 backend services; mỗi service có health checks và autoscaling policy riêng.
- CI/CD theo mô hình deploy staging tự động, promote prod thủ công, có workflow rollback để giảm rủi ro release.

---

## Vòng 1 - Network & Traffic Flow

### Q1. Đi một request từ browser đến backend trong hệ thống của bạn.

Câu trả lời:

- Request vào ALB public, listener rule route theo path như `/api/auth`*, `/api/checkout*`, còn default action về frontend.
- ALB forward vào target group theo `ip` mode vì ECS dùng Fargate `awsvpc`.
- Chỉ target healthy (qua `/health`) mới nhận traffic; unhealthy bị loại khỏi rotation.

Interviewer hỏi sâu:

- Nếu 1 task vừa deploy xong nhưng chưa warm-up, làm sao tránh nhận traffic quá sớm?

### Q2. Vì sao dùng ALB path-based routing thay vì Nginx reverse proxy?

Câu trả lời:

- Trên AWS, ALB đã cung cấp reverse proxy, path routing, health checks, managed scaling và tích hợp chặt với ECS.
- Dùng thêm Nginx ở giữa làm tăng complexity và thêm hop latency mà không tạo giá trị lớn ở quy mô hiện tại.
- Nếu cần advanced edge control (WAF, CDN, TLS policy), mình ưu tiên AWS native trước.

Interviewer hỏi sâu:

- Khi nào bạn vẫn cân nhắc thêm Nginx/Envoy?

### Q3. Không có Nginx thì rủi ro overload nằm ở đâu?

Câu trả lời:

- Rủi ro chính không phải thiếu Nginx, mà là thiếu guardrails như WAF/rate-limit, sizing chưa đủ, hoặc DB bottleneck.
- ALB + autoscaling xử lý tốt phần phân tải, nhưng sudden spike vẫn có thể gây latency trước khi scale out hoàn tất.
- Vì vậy mình bù bằng autoscaling tuning, observability, và release guardrails.

Interviewer hỏi sâu:

- Nêu 2 biện pháp cụ thể để giảm spike impact trong 1 ngày.

---

## Vòng 2 - ECS/Fargate Capacity & Scaling

### Q4. Giải thích `cpu=256`, `memory=512` trên Fargate task.

Câu trả lời:

- Đây là quota cho cả task, không phải cho từng container trong task.
- Với backend task có app + promtail + node-exporter, tất cả chia chung 0.25 vCPU và 512 MiB.
- Đây là baseline theo chi phí; under load mình sẽ ưu tiên nâng `main`, `checkout`, `auth` trước.

Interviewer hỏi sâu:

- Dấu hiệu nào cho thấy đã đến lúc tăng size thay vì chỉ scale số lượng task?

### Q5. Autoscaling của bạn hoạt động chính xác ra sao?

Câu trả lời:

- Target tracking theo `ECSServiceAverageCPUUtilization` với target 70%.
- Vượt ngưỡng đủ lâu thì desired count tăng trong min/max; scale-in chậm hơn scale-out để tránh oscillation.
- Task mới launch, pass health check, rồi ALB mới phân traffic vào.

Interviewer hỏi sâu:

- Vì sao vẫn có latency spike dù autoscaling đang bật?

### Q6. Nếu traffic tăng 10x trong 5 phút, bạn làm gì đầu tiên?

Câu trả lời:

- Kiểm tra service nào chạm CPU/memory và 5xx trước (`main` và `checkout` thường là điểm nóng).
- Tăng tạm max capacity và/hoặc task size cho service nghẽn, theo dõi p95 + error rate sau mỗi bước.
- Nếu vẫn nghẽn, khoanh vùng DB (CPU/connection/slow query) vì thường DB thành bottleneck sau app tier.

Interviewer hỏi sâu:

- Nếu chỉ được thay 1 thông số, bạn đổi gì trước: max tasks hay task size?

---

## Vòng 3 - Observability Stack

### Q7. Mô tả luồng metrics trong hệ thống của bạn.

Câu trả lời:

- Mỗi backend expose `/metrics` qua `prom-client`; Prometheus scrape định kỳ qua service discovery.
- Grafana query Prometheus để hiển thị Infra và Business dashboards.
- Node exporter sidecar cung cấp host/container metrics để theo dõi saturation.

Interviewer hỏi sâu:

- Pull model của Prometheus có ưu/nhược gì trong ECS dynamic environment?

### Q8. Mô tả luồng logs end-to-end.

Câu trả lời:

- App ghi log file, promtail sidecar đọc file và push sang Loki.
- Grafana dùng Loki datasource để query logs theo label service/job.
- Khi incident, mình correlate timestamp giữa metric spike và log errors để chốt root cause.

Interviewer hỏi sâu:

- Bạn tránh high-cardinality labels trong Loki bằng cách nào?

### Q9. Nếu p95 tăng nhưng CPU thấp, bạn nghi gì?

Câu trả lời:

- Khả năng cao là dependency latency: DB query chậm, connection pool nghẽn, hoặc external call timeout.
- Mình kiểm tra error ratio theo route, DB wait/slow queries, và logs timeout trước khi kết luận app CPU issue.
- Đây là case điển hình metrics hệ thống "xanh" nhưng user latency vẫn xấu.

Interviewer hỏi sâu:

- Panel nào bạn mở đầu tiên trong Grafana?

---

## Vòng 4 - CI/CD, Release, Rollback

### Q10. Vì sao bạn chọn staging auto, prod manual?

Câu trả lời:

- Staging auto để rút ngắn feedback loop, prod manual để có human gate trước môi trường ảnh hưởng user.
- Mô hình này giảm nguy cơ release lỗi hàng loạt khi test chưa đủ sâu.
- Với team nhỏ, đây là điểm cân bằng tốt giữa tốc độ và an toàn.

Interviewer hỏi sâu:

- Điều kiện nào thì bạn sẵn sàng chuyển sang full auto deploy prod?

### Q11. Rollback của bạn rollback được gì và không được gì?

Câu trả lời:

- Rollback trả service về task definition/image trước đó, giúp phục hồi runtime nhanh.
- Không tự rollback database schema/data, nên migration phải backward-compatible.
- Nếu schema breaking change đã áp dụng, rollback app có thể không đủ để phục hồi hoàn toàn.

Interviewer hỏi sâu:

- Làm sao thiết kế migration để rollback-friendly?

### Q12. Nêu checklist release readiness trước khi promote prod.

Câu trả lời:

- Functional smoke cho luồng chính: login, browse, cart, checkout, admin thao tác cơ bản.
- Technical SLO check: 5xx, p95, health checks, autoscaling events, log error burst.
- Operational check: migration an toàn, dashboards hoạt động, rollback command/workflow đã sẵn sàng.

Interviewer hỏi sâu:

- Bạn định lượng pass/fail bằng con số nào?

---

## Vòng 5 - Security Hardening (Infra Angle)

### Q13. Nếu bị hỏi "chưa có HTTPS/WAF thì sao", bạn trả lời gì?

Câu trả lời:

- Mình thừa nhận đây là gap đã biết, không né tránh.
- Plan ưu tiên: bật HTTPS listener với ACM + redirect 80->443; sau đó attach AWS WAF với rate-based + managed rules.
- Mình chọn thứ tự theo impact bảo mật trên effort thấp nhất.

Interviewer hỏi sâu:

- Vì sao làm HTTPS trước WAF?

### Q14. App có auth, bạn chặn brute force theo tầng infra thế nào?

Câu trả lời:

- Dùng WAF rate-based rules trước ALB để chặn volumetric abuse từ sớm.
- Kết hợp app-level login rate-limit để enforce policy theo endpoint.
- Theo dõi login failure metrics và alarm để phản ứng nhanh.

Interviewer hỏi sâu:

- Nếu attacker dùng rotating IP thì chiến lược nào bổ sung?

### Q15. Secret management hiện tại và hướng hardening?

Câu trả lời:

- Không commit secret vào git; secret nên inject runtime qua CI/CD secrets hoặc secret manager.
- Hướng production: dùng AWS Secrets Manager/SSM, IAM least privilege cho task roles.
- Có rotation plan rõ ràng cho JWT/DB credentials và window chuyển tiếp để tránh downtime.

Interviewer hỏi sâu:

- Mô tả quy trình rotation DB password an toàn.

Security check:

- Nơi lưu secret: runtime injection (CI/CD secrets / secret manager)
- Ai có quyền truy cập: chỉ role/service cần thiết theo least privilege
- Kế hoạch rotation/revocation: có lịch định kỳ + quy trình khẩn cấp khi lộ secret
- Secret có commit vào git không: **No**

---

## Vòng 6 - Incident Scenarios (Thực chiến)

### Q16. Scenario: sau deploy, checkout 5xx tăng. Bạn xử lý theo thứ tự nào?

Câu trả lời:

- Tạm dừng promote tiếp theo, xác nhận blast radius bằng metrics (5xx/p95 theo route/service).
- Kiểm tra logs checkout và DB errors để phân biệt code regression với dependency bottleneck.
- Nếu là regression rõ, rollback ngay; nếu là capacity issue, scale tạm và mở ticket fix gốc.

Interviewer hỏi sâu:

- SLA nào quyết định "rollback now" thay vì "hotfix trước"?

### Q17. Scenario: ALB health check fail ngẫu nhiên sau scale-out.

Câu trả lời:

- Kiểm tra startup time, app health endpoint readiness, security group, và container-level errors.
- Soát lại health check interval/timeout/startPeriod có phù hợp runtime boot hay không.
- Xem task events để xác định fail do app crash, cold start, hay network path.

Interviewer hỏi sâu:

- Bạn đổi thông số nào đầu tiên để giảm false negative health check?

### Q18. Scenario: chi phí ECS tăng đột biến trong tuần.

Câu trả lời:

- Đối chiếu autoscaling events với traffic thực để xem scale-out có hợp lý hay bị abuse.
- Kiểm tra route nào tạo CPU hot spot; cân nhắc caching/rate limiting trước khi chỉ tăng tài nguyên.
- Tối ưu theo thứ tự: chặn traffic xấu, sửa query nóng, rồi tuning min/max capacity.

Interviewer hỏi sâu:

- Làm sao phân biệt "business growth thật" với "abuse traffic"?

---

## Vòng 7 - Senior Infra Mindset

### Q19. 3 điểm hạ tầng bạn tự đánh giá còn yếu?

Câu trả lời:

- Security baseline chưa hoàn thiện: HTTPS enforcement + WAF còn thiếu.
- Reliability guardrails chưa đủ dày: idempotency checkout và automated post-deploy checks cần nâng cấp.
- Capacity planning mới ở mức baseline, cần stress test và SLO-based tuning sâu hơn.

Interviewer hỏi sâu:

- Vì sao bạn chọn defer các mục đó ở giai đoạn hiện tại?

### Q20. Nếu có 2 ngày, bạn nâng hạ tầng theo thứ tự nào?

Câu trả lời:

- Bật HTTPS ALB với ACM và redirect toàn bộ HTTP.
- Bật WAF rate-based rule + login endpoint rate-limit.
- Thêm checkout idempotency key + dashboard/alert cho 5xx, p95, login failures.

Interviewer hỏi sâu:

- Xếp hạng theo impact/effort và expected risk reduction.

---

## Rubric chấm điểm (Infra)

Chấm mỗi câu từ 1-5:

- Technical correctness
- Trade-off clarity
- Operational realism
- Incident response quality

Tổng mỗi câu: /20  
Mức mục tiêu:

- 16-20: strong infra answer
- 12-15: ổn nhưng thiếu chiều sâu vận hành
- <12: cần bổ sung dữ liệu/kinh nghiệm thực chiến

---

## Checklist trước khi trả lời

Đảm bảo mỗi câu có:

- Kiến trúc hiện tại làm gì
- Rủi ro thực tế là gì
- Cách phát hiện bằng metric/log nào
- Cách giảm thiểu nhanh (mitigation) và fix dài hạn

---

## Mock session 30 phút (Infra-heavy)

- 3 phút system overview
- 10 phút network + scaling + capacity
- 10 phút observability + incident drill
- 5 phút security hardening
- 2 phút closing

Closing prompt:
"Vì sao team có thể tin bạn vận hành production an toàn, không chỉ build cho chạy?"