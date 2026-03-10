# Retail Store (Plush Haven) — Video script

Script for presenting or recording each section. Read as-is or use as bullet points and speak naturally.

---

## Part 1. Hook + Overview (0:30–1:00)

*[Screen: title or app homepage]*

"Hi, this is Plush Haven — a plush toy e‑commerce site I built full‑stack, from frontend and backend to database and infrastructure on AWS.

In this video I’ll: quickly demo the app for both users and admins, walk through the architecture and tech stack, then go through each skill set I used — frontend, backend, database, auth, cloud, CI/CD, and monitoring. The goal is to give you a clear picture of the system and the skills applied in this project."

---

## Part 2. App demo — User (1:00–1:15)

*[Browser: open homepage]*

"This is the Plush Haven homepage. Users can browse products, filter by category — character, food, animal — and switch between English and Vietnamese."

*[Click a product]*

"On the product page they can add to cart. Cart and checkout are handled by two separate APIs — cart and checkout — with path-based routing on the ALB."

*[Add to cart, open cart, go to checkout]*

"At checkout, the user enters address and phone and chooses COD or card payment. This is a simulated flow; it doesn’t call a real payment gateway. When the Auth service is enabled, users must log in or register before using the shop."

---

## Part 2 (continued). App demo — Admin (0:45–1:00)

*[Go to /admin, log in as admin]*

"The admin area has two main sections: Orders and Products. In Orders I can view orders and their status. In Products I can add, edit, and delete products and upload images — in production images are stored in S3 so they survive container restarts. The whole admin is protected with JWT and an admin role."

---

## Part 3. Architecture & tech stack (1:30–2:00)

*[Screen: architecture diagram — Browser, ALB, ECS, RDS]*

"High-level architecture: from the browser, requests go through an Application Load Balancer on AWS. The ALB routes by path: the static site and API traffic are split between the frontend and five backend services running on ECS Fargate. All backends share a single PostgreSQL database on RDS.

The frontend is React 19 with Vite 7 and TypeScript. The backend is Node.js and Express, split into five services: main — products and likes; cart — shopping cart; checkout — orders; auth — login, register, and orders; admin — order and product management. I split by domain like this so each part can scale and be deployed independently, while still sharing one Prisma schema and one database."

---

## Part 4. Frontend & backend (1:30–2:00)

*[Optional: open VS Code — frontend and backend folders]*

"On the frontend I use React with TypeScript, Vite for build and dev, React Router for the SPA, and react-i18next for i18n. Structure includes pages — Home, Checkout, Login, Register, Orders — and admin: Orders, Products. API calls go through Vite’s proxy to the right backend by path.

On the backend, each service has its own entry point — main, cart, checkout, auth, admin — all using Express and Prisma. The Prisma schema is defined once and shared across services. Auth and admin use JWT and bcrypt; cart and checkout use the x-cart-session header to tie the cart to a session. For admin image uploads: when the S3 env var is set we write to S3, otherwise we store locally for dev. Each service also exposes a GET /metrics endpoint with prom-client for Prometheus to scrape."

---

## Part 5. Data & auth (0:45–1:00)

*[Optional: open Prisma schema or Prisma Studio]*

"The database is PostgreSQL, with schema and migrations managed by Prisma. The seed creates categories, products, and demo user and admin accounts. For auth: login and register are handled by the Auth service, passwords are hashed with bcrypt, and JWT is used for both user and admin with different secrets and roles. User orders are also exposed by the Auth service via the orders API."

---

## Part 6. Infra & CI/CD (1:30–2:00)

*[Optional: open terraform-prod folder, .github/workflows]*

"Infrastructure is written in Terraform with two environments: staging and prod. Both have VPC, ALB path-based routing, ECS Fargate for the frontend and five backends, ECR, and RDS PostgreSQL. Prod adds service discovery — Cloud Map — so Prometheus can scrape backends via internal DNS, and an observability module: Prometheus, Grafana, and Loki. Prod image uploads use S3; the bucket and IAM are defined in Terraform too.

CI/CD runs on GitHub Actions. A push to main triggers a build of frontend and backend, push to ECR, and deploy to ECS staging. When staging looks good, I promote the code to the prod repo and run the Deploy to Prod workflow there. There’s a Rollback Prod workflow to revert to the previous task definition if needed, and a Seed Prod workflow to run the database seed once. The prod load test runs with k6 and can be triggered manually or on a schedule."

---

## Part 7. Observability & load test (1:00–1:30)

*[Screen: Grafana — Infra and Business dashboards]*

"Monitoring is enabled only in production. Prometheus scrapes the /metrics endpoint of each backend via service discovery; Grafana is reached at /grafana on the same ALB. I have two dashboards: Infra — request rate, latency, 5xx errors, and CPU and memory from Node Exporter; and Business — login rate, total logins, checkout by payment method, top products, and sales by category. The business metrics — auth_logins_total, checkout_payments_total, product_sales_total — are incremented in the auth and checkout services on real events. App logs are sent to Loki via a Promtail sidecar.

The load test is written in k6 and simulates the flow: register, login, view product, add to cart, and checkout with COD or card. The script runs from GitHub Actions or locally with BASE_URL pointing at the prod ALB to generate traffic and populate the business metrics on the dashboard."

---

## Part 8. Wrap-up (0:20–0:30)

*[Optional: back to homepage or repo screen]*

"In short, this is a full-stack app with React and Express, a PostgreSQL database, deployed on AWS with Terraform, CI/CD with GitHub Actions, and monitoring with Prometheus and Grafana. The repo includes a README for setup and running locally, MONITORING for observability and load testing, COST-ESTIMATE for AWS costs, and in the docs folder there’s material for DevOps interview prep. Thanks for watching; if you want to see the code or read more, check out the repo. Bye."

---

## Recording notes

- Speak clearly and stress key terms (service names, tech names).
- For the demo: have staging or prod and sample data ready so nothing fails on camera.
- For code/infra: a quick pass over folders and one or two key files is enough; no need to read every line.
- You can shorten sentences in any section to hit your target length.

push