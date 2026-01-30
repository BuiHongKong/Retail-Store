# Retail Store — Data-first structure & backend

## 1. Hình dữ liệu (data shape)

### Entity relationship (đơn giản)

```
┌─────────────────┐         ┌─────────────────┐
│   Category      │  1    * │   Product       │
├─────────────────┤────────├─────────────────┤
│ id (PK)         │         │ id (PK)         │
│ slug            │         │ slug            │
│ name            │         │ name            │
│ description?    │         │ description?    │
│ sortOrder       │         │ categoryId (FK) │
└─────────────────┘                                     │ price           │
                            │ currency        │
                            │ imageUrl        │
                            │ rating          │
                            │ ratingCount     │
                            │ stock           │
                            │ createdAt       │
                            │ updatedAt       │
                            └─────────────────┘
```

- **3 category**: `character`, `food`, `animal`.
- **Product**: nhiều product thuộc 1 category; mỗi product có 1 ảnh trong `backend/assets/` (đặt tên `{slug}-{category}.png`).

### Nguồn dữ liệu mẫu

| File | Mục đích |
|------|----------|
| `backend/data/schema/types.ts` | TypeScript types — single source of truth cho shape |
| `backend/data/seed/categories.json` | 3 categories |
| `backend/data/seed/products.json` | 9 products, map 1:1 với 9 ảnh trong `backend/assets/` |

---

## 2. Gợi ý DB & backend stack

### Database

| Option | Khi nào dùng | Ghi chú |
|--------|--------------|---------|
| **SQLite** | Dev, demo, single-instance | File-based, không cần server DB. Prisma/Drizzle hỗ trợ tốt. |
| **PostgreSQL** | Production, scale, multi-user | Chuẩn cho production; cần cài/cloud DB. |

**Đề xuất**: Bắt đầu với **SQLite** (schema giống nhau), sau cần scale thì đổi connection string sang PostgreSQL (Prisma/Drizzle đổi ít code).

### Backend stack

| Thành phần | Gợi ý | Lý do |
|------------|--------|--------|
| **Runtime** | Node.js (LTS) | Dùng chung types với frontend (TypeScript), ecosystem lớn. |
| **Framework** | Express hoặc Fastify | Express quen thuộc; Fastify nhanh hơn, type-safe hơn. |
| **ORM / query** | Prisma hoặc Drizzle | Schema-first, migrate từ `backend/data/schema` dễ; Prisma GUI tiện, Drizzle nhẹ. |
| **Validation** | Zod | Validate body/query theo đúng `backend/data/schema/types`. |
| **API style** | REST (JSON) | Đơn giản: `GET /categories`, `GET /products`, `GET /products?categoryId=...`. |

**Luồng**: Request → validate (Zod) → service/repository (đọc DB) → trả JSON đúng shape trong `types.ts`.

---

## 3. Cấu trúc thư mục đề xuất

```
Retail Store/
├── backend/                   # Data + API server
│   ├── assets/                # Ảnh sản phẩm (đồ nhồi bông)
│   │   ├── *-character.png
│   │   ├── *-food.png
│   │   └── *-animal.png
│   │
│   ├── data/                  # DATA FIRST — shape & seed
│   │   ├── schema/
│   │   │   ├── types.ts       # TypeScript types (Category, Product, API response)
│   │   │   └── README.md
│   │   └── seed/
│   │       ├── categories.json
│   │       └── products.json
│   │
│   ├── docs/
│   │   └── DATA_AND_STRUCTURE.md  # File này
│   │
│   ├── prisma/                # (sau khi thêm) hoặc drizzle/
│   │   └── schema.prisma      # DB schema đồng bộ với data/schema
│   ├── src/
│   │   ├── routes/            # categories, products
│   │   ├── services/
│   │   └── index.ts
│   └── package.json
│
└── frontend/                  # Sau khi có API — chỉ render data
    └── ...
```

**Thứ tự làm**:  
1. **Data** (đã có): shape + seed trong `backend/data/`.  
2. **Backend**: DB schema từ `backend/data/schema`, seed từ `backend/data/seed`, API trả đúng shape.  
3. **Frontend**: gọi API, render theo shape (categories + products).

---

## 4. API endpoints (định hướng)

- `GET /api/categories` → `CategoryListResponse`
- `GET /api/products` → `ProductListResponse` (query: `?categoryId=`, `?page=`, `?pageSize=`)
- `GET /api/products/:slug` → 1 `Product` (chi tiết)

Frontend chỉ cần biết 3 endpoint này và shape trong `backend/data/schema/types.ts` để render.

---

## 5. Rủi ro / lưu ý

- **imageUrl**: Seed dùng URL đầy đủ dev (`http://localhost:5173/assets/...`). Production nên dùng CDN/storage URL (hoặc base URL từ env).
- **price**: Đang lưu integer (VND). Không lưu float để tránh lỗi làm tròn.
- **stock**: Cần cập nhật khi có order (sẽ cần thêm bảng Order/OrderItem sau).

Nếu bạn muốn, bước tiếp theo có thể là: thêm Prisma schema + script seed DB từ `backend/data/seed/*.json`.

---

## 6. Giỏ hàng (cart) — định hướng

Khi thêm chức năng **giỏ hàng** và **bỏ sản phẩm vào giỏ**, làm theo thứ tự dưới đây.

### 6.1 Chọn nơi lưu giỏ hàng

| Cách | Khi nào dùng | Ghi chú |
|------|--------------|---------|
| **Chỉ frontend** (state + localStorage) | Không cần đăng nhập; giỏ đơn giản, mất khi xóa storage. | Nhanh, không cần API cart. Frontend lưu `{ productId, quantity }[]`, tự tính tổng từ danh sách product. |
| **Backend** (DB + session/user) | Cần giỏ đồng bộ nhiều thiết bị, hoặc trước khi có checkout. | Cần bảng Cart/CartItem (hoặc dùng session). API: lấy/cập nhật/xóa giỏ. |

**Đề xuất**: Bắt đầu với **cart chỉ ở frontend** (state + localStorage). Khi cần đăng nhập hoặc checkout qua backend thì thêm API + bảng Cart.

### 6.2 Data shape (khi có cart)

Thêm vào `backend/data/schema/types.ts` (dùng cho frontend state hoặc API):

- **CartItem**: `productId`, `quantity` (số lượng). Có thể thêm `product` (Product) khi API trả về giỏ kèm thông tin sản phẩm.
- **Cart**: danh sách `items: CartItem[]`; có thể thêm `total` (tổng tiền) tính từ server hoặc client.

Khi lưu backend: thêm bảng `Cart` (id, userId hoặc sessionId, updatedAt) và `CartItem` (cartId, productId, quantity).

### 6.3 API (nếu cart lưu backend)

- `GET /api/cart` → trả giỏ của user/session (items + product info).
- `POST /api/cart/items` — body `{ productId, quantity }` — thêm/sửa số lượng.
- `PATCH /api/cart/items/:productId` — body `{ quantity }` — sửa số lượng.
- `DELETE /api/cart/items/:productId` — xóa một món khỏi giỏ.

Validate: `productId` tồn tại, `quantity` ≤ stock, quantity > 0.

### 6.4 Frontend — "Thêm vào giỏ"

1. **State**: Dùng React Context, Zustand, hoặc Redux lưu giỏ dạng `{ productId: quantity }` hoặc `CartItem[]`.
2. **Persist**: Nếu cart chỉ ở client, ghi/đọc từ `localStorage` khi thay đổi giỏ.
3. **Nút "Thêm vào giỏ"**: Gọi `addToCart(productId, quantity)` → cập nhật state (và localStorage hoặc gọi API cart).
4. **Hiển thị giỏ**: Trang/component giỏ đọc state (hoặc GET /api/cart), map productId → lấy tên/giá/ảnh từ danh sách product (đã load hoặc từ API). Tự tính tổng hoặc dùng `total` từ API.

### 6.5 Thứ tự làm gợi ý

1. **Có backend API (categories, products)** — đã định hướng ở mục 4.
2. **Frontend**: Trang danh sách sản phẩm + trang chi tiết sản phẩm; nút "Thêm vào giỏ" chỉ cập nhật state (chưa gọi API cart).
3. **State giỏ**: Context/store lưu `CartItem[]`, sync localStorage.
4. **Trang giỏ**: Hiển thị items, số lượng, tổng tiền; nút tăng/giảm/xóa.
5. **(Tùy chọn)** Khi cần: đăng nhập + API cart + lưu giỏ vào DB.
6. **(Sau này)** Checkout → tạo Order/OrderItem, trừ stock (đã nêu ở mục 5).
