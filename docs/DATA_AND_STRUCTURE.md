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
└─────────────────┘         │ price           │
                            │ currency        │
                            │ imagePath       │
                            │ stock           │
                            │ createdAt       │
                            │ updatedAt       │
                            └─────────────────┘
```

- **3 category**: `character`, `food`, `animal`.
- **Product**: nhiều product thuộc 1 category; mỗi product có 1 ảnh trong `assets/` (đặt tên `{slug}-{category}.png`).

### Nguồn dữ liệu mẫu

| File | Mục đích |
|------|----------|
| `data/schema/types.ts` | TypeScript types — single source of truth cho shape |
| `data/seed/categories.json` | 3 categories |
| `data/seed/products.json` | 9 products, map 1:1 với 9 ảnh trong `assets/` |

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
| **ORM / query** | Prisma hoặc Drizzle | Schema-first, migrate từ `data/schema` dễ; Prisma GUI tiện, Drizzle nhẹ. |
| **Validation** | Zod | Validate body/query theo đúng `data/schema/types`. |
| **API style** | REST (JSON) | Đơn giản: `GET /categories`, `GET /products`, `GET /products?categoryId=...`. |

**Luồng**: Request → validate (Zod) → service/repository (đọc DB) → trả JSON đúng shape trong `types.ts`.

---

## 3. Cấu trúc thư mục đề xuất

```
Retail Store/
├── assets/                    # Ảnh sản phẩm (đồ nhồi bông)
│   ├── *-character.png
│   ├── *-food.png
│   └── *-animal.png
│
├── data/                      # DATA FIRST — shape & seed
│   ├── schema/
│   │   ├── types.ts           # TypeScript types (Category, Product, API response)
│   │   └── README.md
│   └── seed/
│       ├── categories.json
│       └── products.json
│
├── docs/
│   └── DATA_AND_STRUCTURE.md  # File này
│
├── backend/                   # API server (sau khi thêm stack)
│   ├── prisma/                # hoặc drizzle/
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
1. **Data** (đã có): shape + seed.  
2. **Backend**: DB schema từ `data/schema`, seed từ `data/seed`, API trả đúng shape.  
3. **Frontend**: gọi API, render theo shape (categories + products).

---

## 4. API endpoints (định hướng)

- `GET /api/categories` → `CategoryListResponse`
- `GET /api/products` → `ProductListResponse` (query: `?categoryId=`, `?page=`, `?pageSize=`)
- `GET /api/products/:slug` → 1 `Product` (chi tiết)

Frontend chỉ cần biết 3 endpoint này và shape trong `data/schema/types.ts` để render.

---

## 5. Rủi ro / lưu ý

- **imagePath**: Đang dùng path relative (`/assets/...`). Production nên dùng CDN hoặc storage URL.
- **price**: Đang lưu integer (VND). Không lưu float để tránh lỗi làm tròn.
- **stock**: Cần cập nhật khi có order (sẽ cần thêm bảng Order/OrderItem sau).

Nếu bạn muốn, bước tiếp theo có thể là: thêm Prisma schema + script seed DB từ `data/seed/*.json`.
