# Plush Haven — Retail Store: Interview Presentation
*Technical Walkthrough · AWS ECS Fargate · ap-southeast-1*

---

## 1. Introduction & Project Overview

Hi, thank you for having me. I'd like to walk you through **Plush Haven**, a production-grade e-commerce platform I built for selling stuffed animals.

The project is a full-stack system — a **React/Vite** frontend and a **Node.js/Express** backend — deployed on AWS using **Terraform** and **GitHub Actions**. What I'm most proud of, beyond the application itself, is the completeness of the platform: two isolated environments (staging and production), a safe promotion workflow, and a full observability stack in production.

The core engineering challenge I set out to solve was:
> **How do you build a cloud system that a small team can operate with confidence — where deployments are safe, failures are visible, and rollbacks take seconds?**

Let me walk you through the architecture and the decisions behind it.

---

## 2. Infrastructure Architecture Deep Dive

### Networking — Two Isolated VPCs

Each environment lives in a completely separate VPC in `ap-southeast-1`, with non-overlapping CIDR blocks:

| Environment | VPC CIDR |
|---|---|
| Staging | `10.0.0.0/16` |
| Production | `10.1.0.0/16` |

Each VPC spans **two Availability Zones** (`ap-southeast-1a`, `ap-southeast-1b`), with:
- **Public subnets** — for the Application Load Balancer
- **Private subnets** — for ECS tasks and RDS

The NAT Gateway is optional, controlled by an `enable_nat_gateway` Terraform flag. When disabled (cost saving), ECS tasks run in the public subnets with a public IP for ECR image pulls. When enabled, all workloads move to private subnets and route outbound through the NAT.

### Compute — ECS Fargate (Serverless)

I deliberately chose **ECS Fargate** over Kubernetes because this project didn't need the orchestration complexity of EKS. Fargate eliminates EC2 fleet management entirely — no patching, no capacity planning, just containers.

The ECS cluster runs **6 Fargate services**. The backend is split into 5 specialized microservices, all built from a **single shared Docker image** — the `entrypoint.sh` script reads the `SERVICE` environment variable at startup to decide which Node server to run:

| Service | Port | API Path |
|---|---|---|
| `frontend` | `:80` | Default — React SPA via Nginx |
| `main` | `:3000` | `/api*`, `/uploads*` |
| `cart` | `:3001` | `/api/cart*` |
| `checkout` | `:3002` | `/api/checkout*` |
| `auth` | `:3003` | `/api/auth*`, `/api/orders*` |
| `admin` | `:3004` | `/api/admin*` |

Each task is allocated `256 vCPU / 512 MB` memory. This separation means a spike in cart traffic never starves the authentication service.

### Traffic — ALB with Path-Based Routing

A single internet-facing **Application Load Balancer** sits in the public subnets and routes all traffic using **ordered listener rules**:

| Priority | Path Pattern | Target |
|---|---|---|
| 10 | `/api/admin*` | Admin service |
| 20 | `/api/cart*` | Cart service |
| 30 | `/api/checkout*` | Checkout service |
| 40 | `/api/orders*` | Auth service |
| 50 | `/api/auth*` | Auth service |
| 60 | `/api*`, `/uploads*` | Main service |
| Default | `/*` | Frontend (Vite/Nginx) |

In production, a `/grafana` rule is also added to route monitoring traffic to the Grafana service.

**Security Groups** enforce strict ingress:
- ALB SG → accepts `:80` from `0.0.0.0/0` only
- ECS SG → accepts `:80` and `:3000–3004` from the ALB SG only
- RDS SG → accepts `:5432` from the ECS SG only — **no public database access**

### Database — RDS PostgreSQL 15

A managed `db.t3.micro` RDS instance (20 GB) runs **PostgreSQL 15** in the private subnets, database name `retail_store`. Schema is managed entirely by **Prisma**. The database is seeded on first deploy via a one-off ECS `run-task` override command that runs `npx prisma db seed`.

### Storage — S3 for Product Images

An S3 bucket (`retail-store-{env}-uploads-{account-id}`) stores admin-uploaded product images. It's configured with **public read** so image URLs work directly in the browser without a CDN layer. The ECS task role has a least-privilege policy granting only `PutObject` and `GetObject` on this specific bucket — the Admin service uses it.

### Container Registries — ECR

Two ECR repositories per environment:
- `retail-store-frontend-{env}` — React/Nginx image
- `retail-store-backend-{env}` — shared Node backend image
- `retail-store-grafana-prod` — custom Grafana image with dashboards pre-provisioned (prod only)

A **lifecycle policy** retains the last 10 images automatically, preventing storage costs from growing unbounded.

---

## 3. Production-Only Features

### Auto-Scaling — CPU Target Tracking

Production adds **Application Auto Scaling** on every ECS service, using a Target Tracking policy set to **CPU 70%**:

| Services | Min | Max | Rationale |
|---|---|---|---|
| Frontend, Main, Cart, Checkout | 1 | **6** | Customer-facing, must handle load spikes |
| Auth, Admin | 1 | **2** | Lower traffic; cost controlled |

Scale-out cooldown: 60s (react fast). Scale-in cooldown: 180s (avoid thrashing).

### Observability — LGTM Stack

Production deploys a full observability cluster within the same ECS cluster:

- **Prometheus** — scrapes `GET /metrics` (via `prom-client`) from all 5 backend services on ports `:3000–3004`. It also scrapes **Node Exporter** sidecars (`:9100`) attached to each backend task for CPU and memory at the task level.
- **Loki** — log aggregation, accessible at `loki.retail-store.local:3100`
- **Grafana** — built from a custom ECR image that ships with datasources and dashboards pre-provisioned. Exposed at ALB path `/grafana`. Two dashboards:
  - **Retail Store - Infra**: request rate, p50/p99 latency, 5xx error rate, CPU/memory
  - **Retail Store - Business**: login rate, checkout count, top products, sales by category

### Cloud Map — Service Discovery

Instead of hardcoded IPs, Prometheus resolves backend addresses via **AWS Cloud Map** private DNS namespace `retail-store.local`. Each backend ECS service registers itself:

```
main.retail-store.local:3000
cart.retail-store.local:3001
checkout.retail-store.local:3002
auth.retail-store.local:3003
admin.retail-store.local:3004
prometheus.retail-store.local:9090
loki.retail-store.local:3100
```

This means the scrape targets stay valid even when Fargate replaces task IPs on restarts.

---

## 4. The Business Value Argument

### Operational Safety by Design

The biggest risk in any e-commerce system is **bad deployments reaching customers**. I addressed this with three layers:

1. **Environment Isolation** — Staging and prod have separate VPCs, separate ECR repos, separate RDS instances. A mistake in staging physically cannot affect production.
2. **GitHub Environment Approval Gate** — Production deployment is a separate CI job that requires a named `prod` environment approval in GitHub. No one accidentally ships to prod.
3. **One-Step Rollback** — Before every prod deploy, the CI tags the current `prod-latest` image as `prod-previous`. If something goes wrong, a rollback workflow re-deploys from `prod-previous`. Recovery is measured in minutes, not hours.

### Cost Efficiency

- **Fargate**: pay only for running tasks, not idle EC2 capacity
- **Auto-scaling**: services shrink during quiet periods automatically
- **ECR lifecycle policies**: old images pruned automatically (keep 10)
- **CloudWatch retention**: 7-day log retention avoids log storage creep
- **NAT Gateway as a flag**: can be disabled in staging to save ~$32/month

### Proactive Performance Validation

A **k6 load test** script (`scripts/load/k6-prod.js`) simulates the full user journey — register → login → browse → add to cart → checkout — and can be run on demand or via a scheduled GitHub Actions workflow. The results appear in Grafana in real-time, so we know how the system behaves under load *before* a flash sale, not after.

---

## 5. The Complete CI/CD Workflow

```
git push → main
   │
   ├─ Lint frontend (npm run lint)
   ├─ Docker build: backend + frontend
   ├─ Push to ECR: staging-{sha} + staging-latest
   ├─ ECS update-service × 6 (rolling deploy → staging)
   ├─ Prisma seed task (run-task override)
   │
   └─ [GitHub Environment: prod] ← Manual approval gate
          │
          ├─ Tag prod-latest → prod-previous (rollback anchor)
          ├─ Docker build: backend + frontend
          ├─ Push to ECR: prod-{sha} + prod-latest
          └─ ECS update-service × 6 (rolling deploy → prod)
```

CloudWatch log groups (`/ecs/retail-store-{env}-*`) capture every container's stdout with 7-day retention. Logs are also shippable to Loki for cross-service querying in Grafana.

---

## 6. What This Project Demonstrates

| Skill | Evidence |
|---|---|
| **Infrastructure as Code** | Terraform manages VPCs, ECS, RDS, ALB, ECR, S3, IAM, Cloud Map, auto-scaling, and the full observability module |
| **Microservices Architecture** | 6 decoupled services behind a single ALB with path-based routing |
| **Operational Safety** | Isolated environments, approval gates, and image tagging for instant rollback |
| **Observability** | Full LGTM stack with infra and business metrics dashboards, service discovery via Cloud Map |
| **Cost Consciousness** | Fargate, optional NAT, auto-scaling, lifecycle policies, and log retention all tuned |
| **Developer Experience** | One push to `main` handles linting, building, deploying staging, and seeding the DB automatically |

I'm happy to go deeper into any specific component — the Terraform module structure, the ALB routing logic, the Prometheus scraping setup, or the CI/CD pipeline. Where would you like to start?
