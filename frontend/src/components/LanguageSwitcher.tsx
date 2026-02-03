import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { patchPreferredLocale } from "../auth/api";
import { setLocale } from "../i18n/i18n";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const current = (i18n.language === "en" ? "en" : "vi") as "vi" | "en";

  const handleLocale = (lng: "vi" | "en") => {
    setLocale(lng);
    if (user) {
      patchPreferredLocale(lng).catch(() => {
        // Preference saved locally; backend sync failed (e.g. offline). No toast for minimal UX.
      });
    }
  };

  return (
    <div className="language-switcher" role="group" aria-label="Language">
      <button
        type="button"
        className={`language-switcher__btn ${current === "vi" ? "language-switcher__btn--active" : ""}`}
        onClick={() => handleLocale("vi")}
        aria-pressed={current === "vi"}
      >
        VI
      </button>
      <button
        type="button"
        className={`language-switcher__btn ${current === "en" ? "language-switcher__btn--active" : ""}`}
        onClick={() => handleLocale("en")}
        aria-pressed={current === "en"}
      >
        EN
      </button>
    </div>
  );
}
