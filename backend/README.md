# Retail Store Backend

API backend (Express) + Prisma + PostgreSQL. API sản phẩm nằm trong `services/product`.

---

## Yêu cầu

- **Node.js** >= 18
- **PostgreSQL** (chạy bằng Docker Desktop hoặc cài trực tiếp)
- **Docker Desktop** (nếu dùng Docker cho Postgres)

---

## Setup từ đầu (không bỏ bước)

### Bước 1: Cài dependency

Trong thư mục `backend/`:

```bash
cd backend
npm install
```

(Sau `npm install`, script `postinstall` sẽ chạy `prisma generate` tự động.)

---

### Bước 2: Chạy PostgreSQL

**Cách A — Dùng Docker (khuyến nghị)**

1. Mở **Docker Desktop**, đảm bảo Docker đang chạy.
2. Ở **thư mục gốc project** (chứa `docker-compose.yml`):

   ```bash
   docker compose up -d
   ```

3. Kiểm tra container: `docker ps` — thấy `retail-store-postgres` đang chạy là được.

**Cách B — PostgreSQL cài sẵn trên máy**

1. Khởi động PostgreSQL.
2. Tạo database (bằng `psql` hoặc pgAdmin):

   ```sql
   CREATE DATABASE retail_store;
   ```

3. Ghi nhớ **user**, **password**, **port** (mặc định 5432) để điền vào `.env` ở bước 3.

---

### Bước 3: Tạo file `.env`

Trong thư mục `backend/`:

```bash
cp .env.example .env
```

- Nếu dùng **Docker** như bước 2A: thường **không cần sửa** `.env` (đã khớp user/password/db).
- Nếu dùng **Postgres cài sẵn**: mở `.env`, sửa `DATABASE_URL` cho đúng:

  ```
  DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/retail_store"
  ```

  Thay `USER`, `PASSWORD` và port nếu khác 5432.

---

### Bước 4: Tạo bảng trong database (migration)

Trong thư mục `backend/`:

```bash
npx prisma migrate dev --name init
```

- Lần đầu sẽ tạo thư mục `prisma/migrations/` và các bảng `categories`, `products`.
- Nếu báo lỗi kết nối: kiểm tra lại Postgres đã chạy và `DATABASE_URL` trong `.env`.

---

### Bước 5: Seed dữ liệu mẫu

Trong thư mục `backend/`:

```bash
npx prisma db seed
```

- Script đọc `data/seed/products.json`, tạo 3 category và 9 product.
- Chạy xong có thể kiểm tra bằng `npx prisma studio` (tuỳ chọn).

---

### Bước 6: Chạy server

Trong thư mục `backend/`:

```bash
npm run dev
```

- Server chạy tại **http://localhost:3000**.
- Kiểm tra nhanh: mở trình duyệt hoặc `curl http://localhost:3000/api/products`.

---

## Tóm tắt lệnh (sau khi đã setup lần đầu)

| Mục đích | Lệnh |
|----------|------|
| Chạy Postgres (Docker) | Ở root project: `docker compose up -d` |
| Cài dependency | Trong `backend/`: `npm install` |
| Tạo/sửa bảng (migration) | Trong `backend/`: `npx prisma migrate dev --name <tên>` |
| Seed lại dữ liệu | Trong `backend/`: `npx prisma db seed` |
| Chạy API | Trong `backend/`: `npm run dev` |
| Dừng Postgres (Docker) | Ở root project: `docker compose down` |

---

## API

| Method | Path | Mô tả |
|--------|------|--------|
| GET | `/api/products` | Danh sách sản phẩm |
| GET | `/api/products/:slug` | Chi tiết sản phẩm theo slug |
| GET | `/api/categories` | Danh sách category |
| GET | `/api/cart` | Giỏ hàng (header `X-Cart-Session`; nếu không có thì tạo giỏ mới, trả về `sessionId`) |
| POST | `/api/cart/items` | Thêm sản phẩm (body `{ productId, quantity? }`, header `X-Cart-Session`) |
| PATCH | `/api/cart/items/:productId` | Cập nhật số lượng (body `{ quantity }`, header `X-Cart-Session`) |
| DELETE | `/api/cart/items/:productId` | Xóa sản phẩm khỏi giỏ (header `X-Cart-Session`) |
| GET | `/assets/*` | Static (ảnh sản phẩm, banner) |

---

## Scripts trong `package.json`

| Script | Mô tả |
|--------|--------|
| `npm start` | Chạy server (production) |
| `npm run dev` | Chạy server với --watch |
| `npm run prisma:generate` | Generate Prisma Client |
| `npm run prisma:migrate` | Chạy migration (dev) |
| `npm run prisma:push` | Đẩy schema lên DB (không tạo file migration) |
| `npm run prisma:seed` | Chạy seed (đọc từ `data/seed/products.json`) |
| `npm run db:seed` | Push schema + chạy seed (không dùng migration) |

---

## Cấu trúc thư mục

```
backend/
├── .env                 # Biến môi trường (tạo từ .env.example)
├── .env.example         # Mẫu DATABASE_URL, PORT
├── prisma/
│   ├── schema.prisma    # Schema DB (Category, Product, Cart, CartItem)
│   ├── seed.js          # Seed từ data/seed/products.json
│   └── migrations/      # Migration files (sau bước 4)
├── data/seed/
│   └── products.json    # Dữ liệu mẫu sản phẩm
├── services/product/
│   └── router.js        # Routes /api/products, /api/categories
├── services/cart/
│   └── router.js        # Routes /api/cart, /api/cart/items
├── src/
│   └── index.js        # Entry: assets + mount API
└── assets/             # Ảnh (banner, sản phẩm)
```

---

## Lỗi thường gặp

- **"Can't reach database"**  
  Postgres chưa chạy hoặc `DATABASE_URL` sai. Kiểm tra Docker/Postgres và `.env`.

- **"Migration failed"**  
  Đảm bảo đã chạy `npm install` (để có Prisma) và database đã tạo (ví dụ `retail_store`).

- **"Seed failed"**  
  Chạy migration trước (`npx prisma migrate dev --name init`), sau đó mới chạy `npx prisma db seed`.

- **Frontend gọi API bị lỗi**  
  Backend phải chạy tại `http://localhost:3000`. Frontend (Vite) proxy `/api` và `/assets` tới đó — kiểm tra `frontend/vite.config.ts` và chạy backend trước khi mở frontend.
