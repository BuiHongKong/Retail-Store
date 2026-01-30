import "./ProductFilter.css";

export const CATEGORY_OPTIONS = [
  { id: "cat-character", name: "Character" },
  { id: "cat-food", name: "Food" },
  { id: "cat-animal", name: "Animal" },
] as const;

export interface FilterState {
  categoryIds: string[];
  priceMax: string;
}

export interface PriceRange {
  min: number;
  max: number;
}

function formatVnd(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(n) + " ₫";
}

interface ProductFilterProps {
  filter: FilterState;
  onFilterChange: (filter: FilterState) => void;
  /** Khoảng giá từ sản phẩm — cập nhật theo danh sách (sản phẩm mới giá cao/thấp hơn vẫn đúng) */
  priceRange: PriceRange;
}

export function ProductFilter({ filter, onFilterChange, priceRange }: ProductFilterProps) {
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
      <h3 className="product-filter__title">Bộ lọc</h3>

      <div className="product-filter__block">
        <h4 className="product-filter__label">Category</h4>
        <ul className="product-filter__list">
          {CATEGORY_OPTIONS.map((opt) => (
            <li key={opt.id} className="product-filter__item">
              <label className="product-filter__checkbox">
                <input
                  type="checkbox"
                  checked={filter.categoryIds.includes(opt.id)}
                  onChange={() => handleCategoryToggle(opt.id)}
                  aria-label={opt.name}
                />
                <span>{opt.name}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      <div className="product-filter__block">
        <h4 className="product-filter__label">Giá tối đa (VND)</h4>
        <div className="product-filter__sliders">
          <div className="product-filter__slider-row">
            <span className="product-filter__slider-value">
              Đến: {formatVnd(sliderValue)}
            </span>
            <input
              type="range"
              min={rangeMin}
              max={rangeMax}
              step={step}
              value={sliderValue}
              onChange={(e) => handleSliderChange(Number(e.target.value))}
              className="product-filter__range"
              aria-label="Giá tối đa"
            />
            <span className="product-filter__slider-hint">
              {formatVnd(rangeMin)} – {formatVnd(rangeMax)}
            </span>
          </div>
        </div>
      </div>

      <button type="button" className="product-filter__reset" onClick={handleReset}>
        Xóa bộ lọc
      </button>
    </aside>
  );
}
