import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import vi from "./locales/vi.json";
import en from "./locales/en.json";

const STORAGE_KEY = "locale";

function getStoredLocale(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "vi" || stored === "en") return stored;
  } catch {
    // ignore
  }
  return "vi";
}

export function getLocale(): string {
  return i18n.language || getStoredLocale();
}

export function setLocale(lng: "vi" | "en"): void {
  i18n.changeLanguage(lng);
  try {
    localStorage.setItem(STORAGE_KEY, lng);
  } catch {
    // ignore
  }
}

i18n.use(initReactI18next).init({
  resources: {
    vi: { translation: vi },
    en: { translation: en },
  },
  lng: getStoredLocale(),
  fallbackLng: "vi",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
