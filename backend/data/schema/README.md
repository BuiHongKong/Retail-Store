# Data shape (schema)

- **Category**: 3 categories — character, food, animal.
- **Product**: mỗi product thuộc 1 category, có price, imageUrl (URL đầy đủ tới ảnh; file nằm trong `assets/`).

Quan hệ: `Category 1 — * Product` (one-to-many).

File ảnh trong `assets/` đặt tên: `{slug}-{category}.png` (ví dụ `amongus-character.png`).
