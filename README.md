# Plush Haven — Retail Store

Web bán thú nhồi bông: frontend React (Vite) + backend Express (API sản phẩm, likes, giỏ hàng) + PostgreSQL.

---

## Yêu cầu (trước khi setup)

- **Node.js** >= 18  
- **Docker Desktop** (để chạy PostgreSQL) — hoặc cài PostgreSQL trực tiếp trên máy  
- **Git**

---

## Cấu trúc project

```
Retail-Store/
├── backend/          # API Express + Prisma (product, likes, cart, checkout)
├── frontend/         # Web React + Vite (Plush Haven)
├── docker-compose.yml   # PostgreSQL (chạy ở port 5433)
└── README.md         # File này
```

- **Backend** gồm 5 server chạy riêng:
  - **API chính** (product + likes): port **3000**
  - **Cart API**: port **3001**
  - **Checkout API**: port **3002**
  - **Auth API**: port **3003** (tùy chọn — khi bật thì phải đăng nhập mới vào shop)
  - **Admin API**: port **3004** (tùy chọn — khi bật thì có trang Admin tại `/admin`, quản lý đơn hàng, sản phẩm, danh mục)
- **Frontend** (Vite): port **5173** — proxy `/api`, `/api/cart`, `/api/checkout`, `/api/auth`, `/api/orders`, `/api/admin`, `/uploads` tới 3000–3004.
- **User mặc định** (khi bật Auth): `demo@example.com` / `demo123` (tạo khi chạy seed).
- **Admin mặc định** (khi bật Admin): `admin@example.com` / `admin123` (tạo khi chạy seed).

---

## Setup lần đầu (người mới tham gia project)

Làm lần lượt, không bỏ bước.

### 0. Nếu bạn **pull code** (repo đã có sẵn, state cũ hoặc mới)

Bạn đã clone/pull và thấy sẵn thư mục `prisma/migrations/` — tức là migration đã có trong repo. Làm theo thứ tự:

1. **PostgreSQL:** `docker compose up -d` (ở thư mục gốc).
2. **Backend:** `cd backend` → tạo `.env` (xem bước 4 bên dưới) nếu chưa có → `npm install`.
3. **Áp dụng migration có sẵn (không tạo migration mới):**
   ```bash
   npx prisma migrate deploy
   ```
   *(Dùng `migrate deploy` để chỉ apply các migration trong repo; không dùng `migrate dev --name init` trừ khi bạn tự thêm migration mới sau khi sửa `schema.prisma`.)*
4. **Seed (nếu database trống):** `npx prisma db seed`.
5. **Frontend:** `cd frontend` → `npm install`.
6. Chạy các service (xem mục "Chạy project" bên dưới).

**Checklist nhanh sau khi pull:** Docker up → backend `.env` + `npm install` → `prisma migrate deploy` → (tuỳ chọn) `prisma db seed` → frontend `npm install` → chạy 5 backend + 1 frontend.

---

### 1. Clone và mở project

```bash
git clone <url-repo> Retail-Store
cd Retail-Store
```

### 2. Chạy PostgreSQL (database)

**Cách A — Dùng Docker (khuyến nghị)**

- Mở **Docker Desktop**, đảm bảo Docker đang chạy.
- Ở **thư mục gốc** (chứa `docker-compose.yml`):

```bash
docker compose up -d
```

- Kiểm tra: `docker ps` — thấy container `retail-store-postgres` đang chạy.

**Cách B — PostgreSQL cài sẵn trên máy**

- Khởi động PostgreSQL, tạo database:

```sql
CREATE DATABASE retail_store;
```

- Ghi nhớ **user**, **password**, **port** (mặc định 5432) để dùng ở bước 4.

### 3. Cài dependency backend

```bash
cd backend
npm install
```

- Sau `npm install`, Prisma sẽ tự chạy `prisma generate`.

### 4. Tạo file `.env` cho backend

Trong thư mục `backend/`, tạo file `.env` với nội dung:

**Nếu dùng Docker (bước 2A):**

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/retail_store"
PORT=3000
CART_PORT=3001
CHECKOUT_PORT=3002
AUTH_PORT=3003
JWT_SECRET=your-secret-change-in-production
ADMIN_PORT=3004
ADMIN_JWT_SECRET=admin-secret-change-in-production
```

**Nếu dùng PostgreSQL cài sẵn (bước 2B):** sửa `DATABASE_URL` cho đúng user, password và port (thường 5432):

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/retail_store"
PORT=3000
CART_PORT=3001
CHECKOUT_PORT=3002
AUTH_PORT=3003
JWT_SECRET=your-secret-change-in-production
ADMIN_PORT=3004
ADMIN_JWT_SECRET=admin-secret-change-in-production
```

### 5. Tạo bảng trong database (migration)

Vẫn trong `backend/`:

- **Nếu bạn pull repo đã có sẵn `prisma/migrations/`** (người khác đã tạo migration trước đó): chỉ cần áp dụng migration có sẵn:
  ```bash
  npx prisma migrate deploy
  ```
- **Nếu bạn là người tạo repo từ đầu** và chưa có thư mục migrations (hoặc vừa sửa `schema.prisma` và cần tạo migration mới):
  ```bash
  npx prisma migrate dev --name ten_migration
  ```

- Nếu báo lỗi kết nối: kiểm tra Docker/PostgreSQL đã chạy và `DATABASE_URL` trong `.env`.

### 6. Seed dữ liệu mẫu

Trong `backend/`:

```bash
npx prisma db seed
```

- Tạo 3 category, 9 sản phẩm mẫu và **user mặc định** `demo@example.com` / `demo123` (để dùng thử khi bật Auth service).

### 7. Cài dependency frontend

Mở terminal mới, từ **thư mục gốc** project:

```bash
cd frontend
npm install
```

---

## Chạy project (mỗi lần làm việc)

Cần **4 terminal** (backend, cart, checkout, frontend).

### Terminal 1 — PostgreSQL (nếu dùng Docker)

Ở **thư mục gốc** project:

```bash
docker compose up -d
```

- Chạy xong có thể tắt terminal này; container chạy nền. Khi nào muốn tắt DB: `docker compose down`.

### Terminal 2 — Backend API (product + likes)

```bash
cd backend
npm run dev
```

- Server chạy tại **http://localhost:3000**.  
- Kiểm tra nhanh: `curl http://localhost:3000/api/products` hoặc mở trong trình duyệt.

### Terminal 3 — Cart API

```bash
cd backend
npm run dev:cart
```

- Cart API chạy tại **http://localhost:3001**.

### Terminal 4 — Checkout API

```bash
cd backend
npm run dev:checkout
```

- Checkout API chạy tại **http://localhost:3002**.

### Terminal 5 — Auth API (tùy chọn)

- **Không bật:** App chạy bình thường, không cần đăng nhập.
- **Bật:** Phải đăng nhập mới vào shop. Dùng user mặc định: **demo@example.com** / **demo123**.

```bash
cd backend
npm run dev:auth
```

- Auth API chạy tại **http://localhost:3003**.

### Terminal 6 — Admin API (tùy chọn)

- **Không bật:** Trang `/admin` hiển thị "Admin không khả dụng".
- **Bật:** Vào **http://localhost:5173/admin** đăng nhập Admin (quản lý đơn hàng, sản phẩm, danh mục). Tài khoản: **admin@example.com** / **admin123**.

```bash
cd backend
npm run dev:admin
```

- Admin API chạy tại **http://localhost:3004**.

### Terminal 7 — Frontend

```bash
cd frontend
npm run dev
```

- Mở trình duyệt: **http://localhost:5173** — đây là trang web Plush Haven.

---

## Port và URL tóm tắt

| Thành phần        | URL / Port |
|-------------------|------------|
| Frontend (web)    | http://localhost:5173 |
| API product/likes | http://localhost:3000/api |
| Cart API         | http://localhost:3001/api |
| Checkout API     | http://localhost:3002/api |
| Auth API         | http://localhost:3003/api (tùy chọn) |
| Admin API        | http://localhost:3004/api (tùy chọn) |
| PostgreSQL (Docker) | localhost:5433 (trong container là 5432) |

Frontend đã cấu hình proxy: request tới `/api`, `/api/cart`, `/api/checkout`, `/api/auth`, `/api/orders`, `/api/admin`, `/uploads` sẽ được chuyển tới đúng backend.

---

## Tóm tắt lệnh (sau khi đã setup)

| Mục đích | Lệnh |
|----------|------|
| Bật PostgreSQL (Docker) | Ở root: `docker compose up -d` |
| Tắt PostgreSQL (Docker) | Ở root: `docker compose down` |
| Chạy API product + likes | Trong `backend/`: `npm run dev` |
| Chạy Cart API | Trong `backend/`: `npm run dev:cart` |
| Chạy Checkout API | Trong `backend/`: `npm run dev:checkout` |
| Chạy Auth API (bắt buộc đăng nhập) | Trong `backend/`: `npm run dev:auth` |
| Chạy Admin API (trang /admin) | Trong `backend/`: `npm run dev:admin` |
| Chạy frontend | Trong `frontend/`: `npm run dev` |
| Áp dụng migration có sẵn (sau khi pull) | Trong `backend/`: `npx prisma migrate deploy` |
| Tạo migration mới (sửa schema) | Trong `backend/`: `npx prisma migrate dev --name <tên>` |
| Seed lại dữ liệu | Trong `backend/`: `npx prisma db seed` |
| Mở Prisma Studio (xem DB) | Trong `backend/`: `npx prisma studio` |

---

## Lỗi thường gặp

- **"Can't reach database" / Prisma connection error**  
  PostgreSQL chưa chạy hoặc `DATABASE_URL` trong `backend/.env` sai. Nếu dùng Docker: `docker compose up -d` và kiểm tra port **5433** trong `DATABASE_URL`.

- **Migration failed**  
  Đảm bảo đã `npm install` trong `backend/` và database đã tạo (Docker đã chạy hoặc đã tạo DB `retail_store` thủ công). **Sau khi pull code:** dùng `npx prisma migrate deploy` để áp dụng migration có sẵn, không dùng `migrate dev --name init` (dễ gây conflict).

- **Seed failed**  
  Chạy migration trước: `npx prisma migrate dev --name init`, rồi mới chạy `npx prisma db seed`.

- **Frontend gọi API bị 404 / CORS**  
  - Backend (port 3000), Cart (port 3001) và Checkout (port 3002) phải đang chạy.  
  - Mở đúng URL frontend: **http://localhost:5173** (Vite proxy chỉ hoạt động khi truy cập qua dev server).

- **Cart 404 khi thêm vào giỏ**  
  Cart chạy riêng: cần chạy `npm run dev:cart` trong `backend/` (terminal thứ 3).

- **Checkout 404 khi thanh toán**  
  Checkout chạy riêng: cần chạy `npm run dev:checkout` trong `backend/` (terminal thứ 4).

- **Bật Auth (bắt buộc đăng nhập)**  
  Chạy `npm run dev:auth` trong `backend/`. Đăng nhập bằng **demo@example.com** / **demo123** (user tạo khi seed). Khi tắt Auth service, app lại vào shop không cần đăng nhập.

- **Trang Admin (/admin)**  
  Chạy `npm run dev:admin` trong `backend/`. Mở **http://localhost:5173/admin**, đăng nhập **admin@example.com** / **admin123**. Khi tắt Admin service, trang /admin hiển thị "Admin không khả dụng".

- **Windows: "running scripts is disabled" khi chạy npm/npx**  
  PowerShell chặn script: chạy lệnh qua `cmd`: ví dụ `cmd /c "cd /d d:\Retail-Store\backend && npx prisma migrate deploy"`. Hoặc mở Command Prompt (cmd) thay vì PowerShell.

---

## Data shape & seed

- **Category**: 3 categories — character, food, animal.
- **Product**: mỗi product thuộc 1 category, có price, imageUrl, rating (0–5), ratingCount. Quan hệ: `Category 1 — * Product`. File ảnh trong `backend/data/seed/assets/` đặt tên: `{slug}-{category}.png` (vd `amongus-character.png`).
- **Seed**: `backend/data/seed/categories.json` (3 categories), `products.json` (9 products, mỗi product có `imageUrl` trỏ tới file trong `assets/`).

Mapping asset → product slug:

| Asset file | Product slug | Category |
|------------|--------------|----------|
| amongus-character.png | amongus | character |
| baby-character.png | baby | character |
| frog-character.png | frog | character |
| godofweath-character.png | godofweath | character |
| breakfast-food.png | breakfast | food |
| cheese-food.png | cheese | food |
| ramen-food.png | ramen | food |
| cat-animal.png | cat | animal |
| dog-animal.png | dog | animal |

---

## API nhanh (tham khảo)

- **Product:** GET `/api/products`, GET `/api/products/:slug`, GET `/api/categories`
- **Likes:** GET `/api/likes`, POST `/api/likes/items`, DELETE `/api/likes/items/:productId` (header `X-Likes-Session`)
- **Cart:** GET `/api/cart`, POST `/api/cart/items`, PATCH/DELETE `/api/cart/items/:productId` (header `x-cart-session`)

---

## Staging / Production và CI/CD

Repo này là **Staging repo**: merge vào `main` sẽ tự động build và deploy lên môi trường **staging** trên AWS. Môi trường **production** dùng repo riêng; code được đẩy sang bằng bước **promote** thủ công, sau đó trong prod repo chạy **Deploy to Prod** và khi cần **Rollback Prod** cũng trong prod repo.

### Flow tổng quan

| Bước | Repo | Hành động |
|------|------|-----------|
| 1 | Staging repo (repo này) | Merge/push vào `main` → **tự động** build + push ECR + deploy ECS **staging** |
| 2 | Staging repo | Khi staging đã test OK → **manual** chạy workflow **"Promote to Prod Repo"** để đẩy `main` sang prod repo |
| 3 | Prod repo | **Manual** chạy workflow **"Deploy to Prod"** → build + push ECR prod + deploy ECS **prod** |
| 4 | Prod repo | Nếu prod lỗi → **manual** chạy **"Rollback Prod"** với image tag cũ |

### Điều kiện — Terraform Staging

Thư mục **terraform-staging/** (region mặc định **ap-southeast-1**): VPC, ECR, ALB, ECS Fargate, RDS (optional).

- **Prerequisites:** Terraform >= 1.0, AWS CLI đã cấu hình.
- **Quick start:** `cp terraform.tfvars.example terraform.tfvars` → sửa `db_password` (nếu `create_rds = true`) hoặc `create_rds = false` và `database_url` → `terraform init` → `terraform plan` → `terraform apply`.
- **Biến quan trọng:** `aws_region`, `enable_nat_gateway`, `create_rds`, `db_password`, `database_url`.
- **Outputs:** `staging_url`, `ecr_frontend_url`, `ecr_backend_url`, `ecs_cluster_name`.
- **Seed DB (một lần):** Trong `terraform-staging/` chạy `bash run-seed-once.sh` (Git Bash, cần `jq`). User demo: `demo@example.com` / `demo123`, Admin: `admin@example.com` / `admin123`.
- **State:** Mặc định local; muốn S3 thì bỏ comment block `backend "s3"` trong `provider.tf`.

### Điều kiện — Terraform Production

Thư mục **terraform-prod/**: infrastructure production (VPC, ECR, ALB, ECS Fargate, RDS optional). Tách biệt với staging — state riêng, tài nguyên riêng. Region mặc định **ap-southeast-1**.

- **Prerequisites:** Terraform >= 1.0, AWS CLI.
- **Quick start:** `cp terraform.tfvars.example terraform.tfvars` → sửa `db_password`, **bắt buộc đổi** `jwt_secret`, `admin_jwt_secret` khác staging → (nếu S3) bỏ comment `backend "s3"`, key `prod/terraform.tfstate` — **phải khác** staging → `terraform init` → `terraform plan` → `terraform apply`.
- **Biến quan trọng:** `vpc_cidr` (mặc định `10.1.0.0/16`), `create_rds`, `db_password`, `ecr_frontend_name`, `ecr_backend_name`.
- **Outputs:** `prod_url`, `ecr_frontend_url`, `ecr_backend_url`, `ecs_cluster_name`.

### GitHub — Staging repo

**Secrets:** `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ACCOUNT_ID`, `PROD_REPO_TOKEN` (PAT có quyền push prod repo).

**Variables:** `AWS_REGION` = `ap-southeast-1`, `ECR_FRONTEND_STAGING`, `ECR_BACKEND_STAGING`, `ECS_CLUSTER_STAGING`, `PROD_REPO_URL` = `https://github.com/<owner>/retail-store-prod`.

**Lấy PROD_REPO_TOKEN:** GitHub → Settings → Developer settings → Personal access tokens → Generate (scope **repo**), thêm vào repo Staging với tên `PROD_REPO_TOKEN`.

### GitHub — Repo Prod

Secrets: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ACCOUNT_ID`. Variables: `AWS_REGION` = `ap-southeast-1`, `ECR_FRONTEND_PROD` = `retail-store-frontend-prod`, `ECR_BACKEND_PROD` = `retail-store-backend-prod`, `ECS_CLUSTER_PROD` = `retail-prod`. Copy `.github/workflows/examples/deploy-prod.yml.example` vào Prod thành `.github/workflows/deploy-prod.yml`; tương tự rollback từ `rollback-prod.yml.example`.

### Setup GitHub từ đầu (2 repo)

1. **Repo Staging:** New repo `Retail-Store` (private), push code. **Repo Prod:** New repo `retail-store-prod` (private).
2. Terraform Staging: `cd terraform-staging`, cấu hình `terraform.tfvars`, `terraform apply`.
3. Repo Staging: thêm Secrets/Variables như trên. Push/merge `main` → Deploy to Staging chạy tự động.
4. Promote: Staging → Actions → Promote to Prod Repo (manual). Prod → cấu hình Secrets/Variables → copy workflow deploy-prod → Actions → Deploy to Prod (manual).

### Workflows trong repo này

- **CI** (`.github/workflows/ci.yml`): push/PR lên `main` hoặc `develop` — lint frontend.
- **Deploy to Staging** (`.github/workflows/deploy-staging.yml`): push/merge vào `main` — build Docker, push ECR `staging-<sha>` và `staging-latest`, update ECS 6 service staging.
- **Promote to Prod Repo** (`.github/workflows/promote-to-prod.yml`): manual — đẩy `main` sang prod repo.

### Staging URL

Sau deploy: Terraform output `staging_url` hoặc AWS Console → EC2 → Load Balancers → ALB staging → DNS name (hoặc CloudFront domain).

### Docker build local (kiểm tra)

```bash
# Backend
docker build -t retail-backend:test -f backend/Dockerfile backend/
docker run --rm -e SERVICE=main -e PORT=3000 -p 3000:3000 retail-backend:test

# Frontend
docker build -t retail-frontend:test -f frontend/Dockerfile frontend/
docker run --rm -p 8080:80 retail-frontend:test
```

Mở `http://localhost:8080` (frontend); API cần trỏ tới backend (path `/api` qua reverse proxy hoặc CORS).

### File CI/CD & infra đã thêm

| File | Mô tả |
|------|--------|
| `backend/Dockerfile` | Build image backend; env `SERVICE` (main/cart/checkout/auth/admin) chọn server. |
| `backend/entrypoint.sh` | Script chạy đúng file Node theo `SERVICE`. |
| `frontend/Dockerfile` | Multi-stage: build Vite, serve bằng nginx. |
| `frontend/nginx.conf` | Cấu hình nginx (SPA try_files). |
| `.github/workflows/ci.yml` | Lint frontend. |
| `.github/workflows/deploy-staging.yml` | Push `main` → build → ECR → ECS staging. |
| `.github/workflows/promote-to-prod.yml` | Manual: push `main` sang prod repo. |
| `.github/workflows/examples/deploy-prod.yml.example` | Mẫu workflow deploy prod (copy vào prod repo). |
| `.github/workflows/examples/rollback-prod.yml.example` | Mẫu workflow rollback prod (copy vào prod repo). |
| `.github/workflows/load-test-prod.yml` | Optional: scheduled/manual k6 load test; cần secret `PROD_URL`. |

**Monitoring & giả lập user (chỉ prod):** xem [MONITORING.md](MONITORING.md).

---

## Backend — Data structure & design

- **Entity:** Category (id, slug, name, description?, sortOrder) 1 — * Product (id, slug, name, description?, categoryId, price, currency, imageUrl, rating, ratingCount, stock, createdAt, updatedAt). 3 category: character, food, animal. Ảnh trong `backend/assets/` đặt tên `{slug}-{category}.png`.
- **Nguồn dữ liệu:** `backend/data/schema/types.ts` (TypeScript types), `backend/data/seed/categories.json`, `backend/data/seed/products.json`.
- **Stack gợi ý:** PostgreSQL (production), Prisma/Drizzle, Express/Fastify, Zod validation, REST JSON.
- **API định hướng:** `GET /api/categories`, `GET /api/products` (query `?categoryId=`, `?page=`, `?pageSize=`), `GET /api/products/:slug`. Cart: `GET/POST/PATCH/DELETE /api/cart` (items + product info); validate productId tồn tại, quantity ≤ stock.
- **Lưu ý:** imageUrl production nên dùng CDN/storage URL; price lưu integer (VND); stock cập nhật khi có order.

