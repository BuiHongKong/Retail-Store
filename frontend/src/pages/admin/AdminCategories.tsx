import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getAdminCategories,
  createCategory,
  updateCategory,
  type AdminCategory,
} from "../../admin/api";
import "./AdminCategories.css";

export function AdminCategoriesPage() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ slug: "", name: "", description: "", sortOrder: 0 });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    getAdminCategories()
      .then(setCategories)
      .catch((e) => setError(e instanceof Error ? e.message : t("admin.categories.loadError")))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setForm({ slug: "", name: "", description: "", sortOrder: categories.length });
    setEditingId(null);
    setShowForm(false);
    setSubmitError(null);
  };

  const handleEdit = (c: AdminCategory) => {
    setEditingId(c.id);
    setForm({
      slug: c.slug,
      name: c.name,
      description: c.description ?? "",
      sortOrder: c.sortOrder,
    });
    setShowForm(true);
    setSubmitError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);
    try {
      if (editingId) {
        await updateCategory(editingId, {
          name: form.name,
          description: form.description || undefined,
          sortOrder: form.sortOrder,
        });
      } else {
        await createCategory({
          slug: form.slug.trim(),
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          sortOrder: form.sortOrder,
        });
      }
      resetForm();
      load();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Lỗi lưu danh mục");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-categories">
        <p className="admin-categories__loading">{t("common.loading")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-categories">
        <p className="admin-categories__error">{error}</p>
      </div>
    );
  }

  return (
    <div className="admin-categories">
      <div className="admin-categories__header">
        <h1 className="admin-categories__title">{t("admin.categories.title")}</h1>
        <button
          type="button"
          className="admin-categories__btn"
          onClick={() => {
            resetForm();
            setForm({ slug: "", name: "", description: "", sortOrder: categories.length });
            setShowForm(true);
          }}
        >
          {t("admin.categories.add")}
        </button>
      </div>

      {showForm && (
        <form className="admin-categories__form" onSubmit={handleSubmit}>
          <h2 className="admin-categories__form-title">{editingId ? t("admin.categories.formEdit") : t("admin.categories.formAdd")}</h2>
          {!editingId && (
            <div className="admin-categories__field">
              <label className="admin-categories__label">{t("admin.categories.slug")}</label>
              <input
                type="text"
                className="admin-categories__input"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                placeholder="slug-danh-muc"
                required
              />
            </div>
          )}
          <div className="admin-categories__field">
            <label className="admin-categories__label">{t("admin.categories.name")}</label>
            <input
              type="text"
              className="admin-categories__input"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder={t("admin.categories.name")}
              required
            />
          </div>
          <div className="admin-categories__field">
            <label className="admin-categories__label">{t("admin.categories.description")}</label>
            <input
              type="text"
              className="admin-categories__input"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder=""
            />
          </div>
          <div className="admin-categories__field">
            <label className="admin-categories__label">{t("admin.categories.sortOrder")}</label>
            <input
              type="number"
              className="admin-categories__input"
              value={form.sortOrder}
              onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) || 0 }))}
              min={0}
            />
          </div>
          {submitError && <p className="admin-categories__submit-error">{submitError}</p>}
          <div className="admin-categories__form-actions">
            <button type="button" className="admin-categories__btn admin-categories__btn--secondary" onClick={resetForm}>
              {t("common.cancel")}
            </button>
            <button type="submit" className="admin-categories__btn" disabled={submitting}>
              {submitting ? t("common.loading") : t("common.save")}
            </button>
          </div>
        </form>
      )}

      {categories.length === 0 && !showForm ? (
        <p className="admin-categories__empty">{t("admin.categories.empty")}</p>
      ) : (
        <div className="admin-categories__table-wrap">
          <table className="admin-categories__table">
            <thead>
              <tr>
                <th>{t("admin.categories.slug")}</th>
                <th>{t("admin.categories.name")}</th>
                <th>{t("admin.categories.sortOrder")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id}>
                  <td className="admin-categories__slug">{c.slug}</td>
                  <td>{c.name}</td>
                  <td>{c.sortOrder}</td>
                  <td>
                    <button type="button" className="admin-categories__edit-btn" onClick={() => handleEdit(c)}>
                      {t("admin.categories.edit")}
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
