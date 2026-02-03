import { useEffect, useState } from "react";
import {
  getAdminProducts,
  getAdminCategories,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadImage,
  type AdminProduct,
  type AdminCategory,
} from "../../admin/api";
import { useAdminNotification } from "../../admin/AdminNotificationContext";
import "./AdminProducts.css";

function formatPrice(price: number, currency: string): string {
  if (currency === "VND") {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);
  }
  return `${currency} ${price}`;
}

const defaultForm = {
  name: "",
  slug: "",
  description: "",
  categoryId: "",
  price: 0,
  currency: "VND",
  imageUrl: "",
  rating: 0,
  ratingCount: 0,
  stock: 0,
};

export function AdminProductsPage() {
  const { showToast, showConfirm } = useAdminNotification();
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = () => {
    Promise.all([getAdminProducts(), getAdminCategories()])
      .then(([prods, cats]) => {
        setProducts(prods);
        setCategories(cats);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Lỗi tải dữ liệu"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setForm({ ...defaultForm, categoryId: categories[0]?.id ?? "" });
    setEditingId(null);
    setShowForm(false);
    setSubmitError(null);
  };

  const handleDelete = (p: AdminProduct) => {
    showConfirm(`Xóa sản phẩm "${p.name}"?`, async () => {
      setDeletingId(p.id);
      try {
        await deleteProduct(p.id);
        load();
      } catch (e) {
        showToast(e instanceof Error ? e.message : "Xóa thất bại", "error");
      } finally {
        setDeletingId(null);
      }
    });
  };

  const handleEdit = (p: AdminProduct) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      slug: p.slug,
      description: p.description ?? "",
      categoryId: p.categoryId,
      price: p.price,
      currency: p.currency,
      imageUrl: p.imageUrl,
      rating: p.rating,
      ratingCount: p.ratingCount,
      stock: p.stock,
    });
    setShowForm(true);
    setSubmitError(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadImage(file);
      setForm((f) => ({ ...f, imageUrl: url }));
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Upload thất bại");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);
    try {
      if (editingId) {
        await updateProduct(editingId, {
          name: form.name,
          description: form.description || undefined,
          categoryId: form.categoryId,
          price: form.price,
          currency: form.currency,
          imageUrl: form.imageUrl,
          rating: form.rating,
          ratingCount: form.ratingCount,
          stock: form.stock,
        });
      } else {
        await createProduct({
          name: form.name.trim(),
          slug: form.slug.trim(),
          description: form.description.trim() || undefined,
          categoryId: form.categoryId,
          price: form.price,
          currency: form.currency,
          imageUrl: form.imageUrl,
          rating: form.rating,
          ratingCount: form.ratingCount,
          stock: form.stock,
        });
      }
      resetForm();
      load();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Lỗi lưu sản phẩm");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="admin-products"><p className="admin-products__loading">Đang tải...</p></div>;
  if (error) return <div className="admin-products"><p className="admin-products__error">{error}</p></div>;

  return (
    <div className="admin-products">
      <div className="admin-products__header">
        <h1 className="admin-products__title">Sản phẩm</h1>
        <button type="button" className="admin-products__btn" onClick={() => { resetForm(); setForm((f) => ({ ...f, categoryId: categories[0]?.id ?? "" })); setShowForm(true); }}>
          Thêm sản phẩm
        </button>
      </div>

      {showForm && (
        <form className="admin-products__form" onSubmit={handleSubmit}>
          <h2 className="admin-products__form-title">{editingId ? "Chỉnh sửa" : "Thêm sản phẩm"}</h2>
          <div className="admin-products__row">
            <div className="admin-products__field">
              <label className="admin-products__label">Tên</label>
              <input type="text" className="admin-products__input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Tên sản phẩm" required />
            </div>
            {!editingId && (
              <div className="admin-products__field">
                <label className="admin-products__label">Slug</label>
                <input type="text" className="admin-products__input" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} placeholder="slug-san-pham" required />
              </div>
            )}
          </div>
          <div className="admin-products__field">
            <label className="admin-products__label">Mô tả</label>
            <input type="text" className="admin-products__input" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Mô tả (tùy chọn)" />
          </div>
          <div className="admin-products__field">
            <label className="admin-products__label">Danh mục</label>
            <select className="admin-products__input" value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))} required>
              <option value="">-- Chọn danh mục --</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="admin-products__row">
            <div className="admin-products__field">
              <label className="admin-products__label">Giá</label>
              <input type="number" className="admin-products__input" value={form.price || ""} onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) || 0 }))} min={0} required />
            </div>
            <div className="admin-products__field">
              <label className="admin-products__label">Đơn vị</label>
              <input type="text" className="admin-products__input" value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))} placeholder="VND" />
            </div>
          </div>
          <div className="admin-products__field">
            <label className="admin-products__label">Ảnh (URL hoặc upload)</label>
            <div className="admin-products__image-row">
              <input type="text" className="admin-products__input" value={form.imageUrl} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} placeholder="/uploads/xxx hoặc URL" />
              <label className="admin-products__upload-btn">
                <input type="file" accept="image/*" onChange={handleFileChange} disabled={uploading} hidden />
                {uploading ? "Đang tải..." : "Upload"}
              </label>
            </div>
            {form.imageUrl ? <img src={form.imageUrl} alt="" className="admin-products__preview" width={80} height={80} /> : null}
          </div>
          <div className="admin-products__row">
            <div className="admin-products__field">
              <label className="admin-products__label">Rating</label>
              <input type="number" step="0.1" className="admin-products__input" value={form.rating || ""} onChange={(e) => setForm((f) => ({ ...f, rating: Number(e.target.value) || 0 }))} min={0} max={5} />
            </div>
            <div className="admin-products__field">
              <label className="admin-products__label">Số đánh giá</label>
              <input type="number" className="admin-products__input" value={form.ratingCount || ""} onChange={(e) => setForm((f) => ({ ...f, ratingCount: Number(e.target.value) || 0 }))} min={0} />
            </div>
            <div className="admin-products__field">
              <label className="admin-products__label">Tồn kho</label>
              <input type="number" className="admin-products__input" value={form.stock || ""} onChange={(e) => setForm((f) => ({ ...f, stock: Number(e.target.value) || 0 }))} min={0} />
            </div>
          </div>
          {submitError ? <p className="admin-products__submit-error">{submitError}</p> : null}
          <div className="admin-products__form-actions">
            <button type="button" className="admin-products__btn admin-products__btn--secondary" onClick={resetForm}>Hủy</button>
            <button type="submit" className="admin-products__btn" disabled={submitting}>{submitting ? "Đang lưu..." : "Lưu"}</button>
          </div>
        </form>
      )}

      {products.length === 0 && !showForm ? (
        <p className="admin-products__empty">Chưa có sản phẩm nào.</p>
      ) : (
        <div className="admin-products__table-wrap">
          <table className="admin-products__table">
            <thead>
              <tr>
                <th>Ảnh</th>
                <th>Tên</th>
                <th>Giá</th>
                <th>Tồn kho</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td><img src={p.imageUrl} alt="" className="admin-products__thumb" width={48} height={48} /></td>
                  <td>{p.name}</td>
                  <td>{formatPrice(p.price, p.currency)}</td>
                  <td>{p.stock}</td>
                  <td>
                    <button type="button" className="admin-products__edit-btn" onClick={() => handleEdit(p)}>Sửa</button>
                    {" "}
                    <button
                      type="button"
                      className="admin-products__delete-btn"
                      onClick={() => handleDelete(p)}
                      disabled={deletingId === p.id}
                    >
                      {deletingId === p.id ? "Đang xóa..." : "Xóa"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
