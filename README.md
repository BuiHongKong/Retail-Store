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

- **Backend** gồm 3 server chạy riêng:
  - **API chính** (product + likes): port **3000**
  - **Cart API**: port **3001**
  - **Checkout API**: port **3002**
- **Frontend** (Vite): port **5173** — proxy `/api`, `/api/cart`, `/api/checkout` tới 3000, 3001, 3002.

---

## Setup lần đầu (người mới tham gia project)

Làm lần lượt, không bỏ bước.

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
```

**Nếu dùng PostgreSQL cài sẵn (bước 2B):** sửa `DATABASE_URL` cho đúng user, password và port (thường 5432):

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/retail_store"
PORT=3000
CART_PORT=3001
CHECKOUT_PORT=3002
```

### 5. Tạo bảng trong database (migration)

Vẫn trong `backend/`:

```bash
npx prisma migrate dev --name init
```

- Lần đầu sẽ tạo thư mục `prisma/migrations/` và các bảng (categories, products, carts, cart_items, likes).
- Nếu báo lỗi kết nối: kiểm tra Docker/PostgreSQL đã chạy và `DATABASE_URL` trong `.env`.

### 6. Seed dữ liệu mẫu

Trong `backend/`:

```bash
npx prisma db seed
```

- Tạo 3 category và 9 sản phẩm mẫu (đọc từ `data/seed/products.json`).

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

### Terminal 5 — Frontend

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
| PostgreSQL (Docker) | localhost:5433 (trong container là 5432) |

Frontend đã cấu hình proxy: request tới `/api`, `/api/cart`, `/api/checkout` sẽ được chuyển tới đúng backend, không cần gõ port khi gọi từ code frontend.

---

## Tóm tắt lệnh (sau khi đã setup)

| Mục đích | Lệnh |
|----------|------|
| Bật PostgreSQL (Docker) | Ở root: `docker compose up -d` |
| Tắt PostgreSQL (Docker) | Ở root: `docker compose down` |
| Chạy API product + likes | Trong `backend/`: `npm run dev` |
| Chạy Cart API | Trong `backend/`: `npm run dev:cart` |
| Chạy Checkout API | Trong `backend/`: `npm run dev:checkout` |
| Chạy frontend | Trong `frontend/`: `npm run dev` |
| Tạo/sửa bảng DB | Trong `backend/`: `npx prisma migrate dev --name <tên>` |
| Seed lại dữ liệu | Trong `backend/`: `npx prisma db seed` |
| Mở Prisma Studio (xem DB) | Trong `backend/`: `npx prisma studio` |

---

## Lỗi thường gặp

- **"Can't reach database" / Prisma connection error**  
  PostgreSQL chưa chạy hoặc `DATABASE_URL` trong `backend/.env` sai. Nếu dùng Docker: `docker compose up -d` và kiểm tra port **5433** trong `DATABASE_URL`.

- **Migration failed**  
  Đảm bảo đã `npm install` trong `backend/` và database đã tạo (Docker đã chạy hoặc đã tạo DB `retail_store` thủ công).

- **Seed failed**  
  Chạy migration trước: `npx prisma migrate dev --name init`, rồi mới chạy `npx prisma db seed`.

- **Frontend gọi API bị 404 / CORS**  
  - Backend (port 3000), Cart (port 3001) và Checkout (port 3002) phải đang chạy.  
  - Mở đúng URL frontend: **http://localhost:5173** (Vite proxy chỉ hoạt động khi truy cập qua dev server).

- **Cart 404 khi thêm vào giỏ**  
  Cart chạy riêng: cần chạy `npm run dev:cart` trong `backend/` (terminal thứ 3).

- **Checkout 404 khi thanh toán**  
  Checkout chạy riêng: cần chạy `npm run dev:checkout` trong `backend/` (terminal thứ 4).

---

## API nhanh (tham khảo)

- **Product:** GET `/api/products`, GET `/api/products/:slug`, GET `/api/categories`
- **Likes:** GET `/api/likes`, POST `/api/likes/items`, DELETE `/api/likes/items/:productId` (header `X-Likes-Session`)
- **Cart:** GET `/api/cart`, POST `/api/cart/items`, PATCH/DELETE `/api/cart/items/:productId` (header `x-cart-session`)

