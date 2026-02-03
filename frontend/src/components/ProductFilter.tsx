import { useTranslation } from "react-i18next";
import "./ProductFilter.css";

const CATEGORY_IDS = ["cat-character", "cat-food", "cat-animal"] as const;
const CATEGORY_KEYS = {
  "cat-character": "store.filter.categoryCharacter",
  "cat-food": "store.filter.categoryFood",
  "cat-animal": "store.filter.categoryAnimal",
} as const;

export const CATEGORY_OPTIONS = CATEGORY_IDS.map((id) => ({ id }));

export interface FilterState {
  categoryIds: string[];
  priceMax: string;
}

export interface PriceRange {
  min: number;
  max: number;
}

function formatVnd(n: number, locale: string): string {
  return new Intl.NumberFormat(locale === "en" ? "en-US" : "vi-VN").format(n) + " ₫";
}

interface ProductFilterProps {
  filter: FilterState;
  onFilterChange: (filter: FilterState) => void;
  /** Khoảng giá từ sản phẩm — cập nhật theo danh sách (sản phẩm mới giá cao/thấp hơn vẫn đúng) */
  priceRange: PriceRange;
}

export function ProductFilter({ filter, onFilterChange, priceRange }: ProductFilterProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "en" ? "en" : "vi";

  const handleCategoryToggle = (id: string) => {
    const next = filter.categoryIds.includes(id)
      ? filter.categoryIds.filter((c) => c !== id)
      : [...filter.categoryIds, id];
    onFilterChange({ ...filter, categoryIds: next });
  };

  const { min: rangeMin, max: rangeMax } = priceRange;
  const step = Math.max(1000, Math.floor((rangeMax - rangeMin) / 100));
  const sliderValue =
    filter.priceMax === ""
      ? rangeMax
      : Math.min(Math.max(Number(filter.priceMax) || rangeMax, rangeMin), rangeMax);

  const handleSliderChange = (value: number) => {
    const isNoFilter = value >= rangeMax;
    onFilterChange({ ...filter, priceMax: isNoFilter ? "" : String(value) });
  };

  const handleReset = () => {
    onFilterChange({
      categoryIds: [],
      priceMax: "",
    });
  };

  return (
    <aside className="product-filter">
      <h3 className="product-filter__title">{t("store.filter.title")}</h3>

      <div className="product-filter__block">
        <h4 className="product-filter__label">{t("store.filter.categoryLabel")}</h4>
        <ul className="product-filter__list">
          {CATEGORY_OPTIONS.map((opt) => (
            <li key={opt.id} className="product-filter__item">
              <label className="product-filter__checkbox">
                <input
                  type="checkbox"
                  checked={filter.categoryIds.includes(opt.id)}
                  onChange={() => handleCategoryToggle(opt.id)}
                  aria-label={t(CATEGORY_KEYS[opt.id])}
                />
                <span>{t(CATEGORY_KEYS[opt.id])}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      <div className="product-filter__block">
        <h4 className="product-filter__label">{t("store.filter.maxPrice")}</h4>
        <div className="product-filter__sliders">
          <div className="product-filter__slider-row">
            <span className="product-filter__slider-value">
              {t("store.filter.upTo")} {formatVnd(sliderValue, locale)}
            </span>
            <input
              type="range"
              min={rangeMin}
              max={rangeMax}
              step={step}
              value={sliderValue}
              onChange={(e) => handleSliderChange(Number(e.target.value))}
              className="product-filter__range"
              aria-label={t("store.filter.maxPriceAria")}
            />
            <span className="product-filter__slider-hint">
              {formatVnd(rangeMin, locale)} – {formatVnd(rangeMax, locale)}
            </span>
          </div>
        </div>
      </div>

      <button type="button" className="product-filter__reset" onClick={handleReset}>
        {t("store.filter.reset")}
      </button>
    </aside>
  );
}
