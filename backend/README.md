# Retail Store Backend

API backend (Express) + Prisma + PostgreSQL. API sản phẩm nằm trong `services/product`.

## Chạy local

1. **PostgreSQL**  
   Cài và chạy PostgreSQL (local hoặc Docker). Tạo database, ví dụ: `retail_store`.

2. **Biến môi trường**  
   Copy `.env.example` → `.env`, sửa `DATABASE_URL` cho đúng (user, password, host, port, tên DB).

3. **Cài dependency và tạo schema**  
   ```bash
   npm install
   npx prisma migrate dev --name init
   npx prisma db seed
   ```

4. **Chạy server**  
   ```bash
   npm run dev
   ```
   API: `http://localhost:3000`  
   - `GET /api/products` — danh sách sản phẩm  
   - `GET /api/products/:slug` — chi tiết sản phẩm  
   - `GET /api/categories` — danh sách category  
   - `GET /assets/*` — static (ảnh)

## Scripts

| Script | Mô tả |
|--------|--------|
| `npm start` | Chạy server (production) |
| `npm run dev` | Chạy server với --watch |
| `npm run prisma:generate` | Generate Prisma Client |
| `npm run prisma:migrate` | Chạy migration (dev) |
| `npm run prisma:push` | Đẩy schema lên DB (không tạo file migration) |
| `npm run prisma:seed` | Chạy seed (đọc từ `data/seed/products.json`) |
| `npm run db:seed` | Push schema + chạy seed |

## Cấu trúc

- `prisma/schema.prisma` — schema DB (Category, Product)
- `prisma/seed.js` — seed từ `data/seed/products.json`
- `services/product/router.js` — routes `/api/products`, `/api/categories`
- `src/index.js` — entry, mount assets + products API
