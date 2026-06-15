import { useState, useMemo } from "react";
import { useAdminStore, type BulkPreviewItem } from "@/store/admin";
import { useProductsStore } from "@/store/products";
import { useBrandsStore } from "@/store/brands";
import { useActiveStore } from "@/store/context";
import { useAppStore } from "@/store";

// ──────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────

type BulkPriceModalProps = {
  onClose: () => void;
};

// ──────────────────────────────────────────────
// Target labels
// ──────────────────────────────────────────────

const TARGET_LABELS: Record<string, string> = {
  cost: "Cost Price",
  selling: "Selling Price",
  both: "Both Prices",
};

// ──────────────────────────────────────────────
// Preview grouping helper
// ──────────────────────────────────────────────

type ProductGroup = {
  name: string;
  cost?: BulkPreviewItem;
  selling?: BulkPreviewItem;
};

function groupPreviewByProduct(
  preview: BulkPreviewItem[],
): ProductGroup[] {
  const map = new Map<number, ProductGroup>();
  for (const item of preview) {
    const existing = map.get(item.productId) ?? {
      name: item.name,
      cost: undefined,
      selling: undefined,
    };
    if (item.field === "cost") existing.cost = item;
    else existing.selling = item;
    map.set(item.productId, existing);
  }
  return Array.from(map.values());
}

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export default function BulkPriceModal({ onClose }: BulkPriceModalProps) {
  const { storeId } = useActiveStore();
  const categories = useProductsStore((s) =>
    s.categories.filter((c) => c.store_id === storeId && c.parent_id === null),
  );
  const brands = useBrandsStore((s) => s.brands);
  const storeBrands = brands.filter((b) => b.store_id === storeId);

  const bulkPricePreview = useAdminStore((s) => s.bulkPricePreview);
  const bulkPriceConfirm = useAdminStore((s) => s.bulkPriceConfirm);
  const clearBulkPreview = useAdminStore((s) => s.clearBulkPreview);
  const preview = useAdminStore((s) => s.preview);
  const showNotification = useAppStore((s) => s.showNotification);

  // ── Form state ──

  const [categoryId, setCategoryId] = useState<number | "">("");
  const [brandId, setBrandId] = useState<number | "">("");
  const [percent, setPercent] = useState<string>("10");
  const [target, setTarget] = useState<"cost" | "selling" | "both">("selling");
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Derived ──

  const parsedPercent = parseFloat(percent) || 0;
  const groupedPreview = useMemo(
    () => (preview ? groupPreviewByProduct(preview) : []),
    [preview],
  );

  // ── Handlers ──

  function handlePreview() {
    setError(null);

    if (parsedPercent === 0) {
      setError("Percentage must be non-zero");
      return;
    }

    const opts = {
      filter:
        categoryId !== "" || brandId !== "" ? "category" : ("all" as const),
      filterId:
        categoryId !== "" ? (categoryId as number) : undefined,
      percent: parsedPercent,
      target,
      storeId,
      categoryId: categoryId !== "" ? (categoryId as number) : undefined,
      brandId: brandId !== "" ? (brandId as number) : undefined,
    };

    bulkPricePreview(opts);
  }

  function handleApply() {
    setError(null);
    setApplying(true);

    try {
      bulkPriceConfirm();
      showNotification(
        `Prices updated successfully — ${preview?.length ?? 0} field(s) changed`,
      );
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to apply price changes",
      );
      setApplying(false);
    }
  }

  function handleCancel() {
    clearBulkPreview();
    onClose();
  }

  // ── Derived state ──

  const hasPreview = preview !== null && preview.length > 0;
  const canApply = hasPreview && !applying;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 bg-black/40">
      <div className="bg-pos-surface rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col">
        {/* ── Header ── */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-pos-muted/20 shrink-0">
          <h2 className="text-lg font-bold text-pos-text">
            Bulk Price Increase
          </h2>
          <button
            onClick={handleCancel}
            className="text-pos-muted text-xl leading-none touch-target w-10 h-10 flex items-center justify-center rounded-lg hover:bg-pos-background transition-colors"
            aria-label="Close bulk price"
          >
            ✕
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Error */}
          {error && (
            <div className="bg-pos-danger/10 border border-pos-danger/30 text-pos-danger text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          {/* ── Filter section ── */}
          <section>
            <h3 className="text-xs font-semibold text-pos-muted uppercase tracking-wide mb-3">
              Filter Products
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="bulk-category"
                  className="block text-sm font-medium text-pos-text mb-1"
                >
                  Category
                </label>
                <select
                  id="bulk-category"
                  value={categoryId}
                  onChange={(e) =>
                    setCategoryId(
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                  className="w-full border border-pos-muted/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pos-secondary bg-pos-surface touch-target"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="bulk-brand"
                  className="block text-sm font-medium text-pos-text mb-1"
                >
                  Brand
                </label>
                <select
                  id="bulk-brand"
                  value={brandId}
                  onChange={(e) =>
                    setBrandId(
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                  className="w-full border border-pos-muted/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pos-secondary bg-pos-surface touch-target"
                >
                  <option value="">All Brands</option>
                  {storeBrands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* ── Increase section ── */}
          <section>
            <h3 className="text-xs font-semibold text-pos-muted uppercase tracking-wide mb-3">
              Increase Settings
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="bulk-percent"
                  className="block text-sm font-medium text-pos-text mb-1"
                >
                  Increase %
                </label>
                <input
                  id="bulk-percent"
                  type="number"
                  value={percent}
                  onChange={(e) => setPercent(e.target.value)}
                  placeholder="10"
                  step="0.1"
                  min="-100"
                  aria-label="Increase percentage"
                  className="w-full border border-pos-muted/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pos-secondary bg-pos-surface touch-target"
                />
              </div>

              <div>
                <span className="block text-sm font-medium text-pos-text mb-2">
                  Target
                </span>
                <div className="flex items-center gap-4 h-[38px]">
                  {(["cost", "selling", "both"] as const).map((opt) => (
                    <label
                      key={opt}
                      className="flex items-center gap-1.5 text-sm text-pos-text cursor-pointer touch-target"
                    >
                      <input
                        type="radio"
                        name="bulk-target"
                        value={opt}
                        checked={target === opt}
                        onChange={() => setTarget(opt)}
                        className="accent-pos-secondary"
                      />
                      {TARGET_LABELS[opt]}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ── Preview button ── */}
          <button
            onClick={handlePreview}
            disabled={parsedPercent === 0}
            className="w-full px-4 py-2.5 bg-pos-secondary text-white rounded-lg font-medium text-sm touch-target hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {preview === null ? "Preview Changes" : "Refresh Preview"}
          </button>

          {/* ── Preview table ── */}
          {preview !== null && (
            <section>
              <h3 className="text-xs font-semibold text-pos-muted uppercase tracking-wide mb-2">
                Preview — {preview.length} field(s) across{" "}
                {new Set(preview.map((i) => i.productId)).size} product(s)
              </h3>

              {preview.length === 0 ? (
                <div className="bg-pos-background/50 rounded-lg p-6 text-center">
                  <p className="text-sm text-pos-muted">
                    No products match the selected filters.
                  </p>
                  <p className="text-xs text-pos-muted/60 mt-1">
                    Try changing the category or brand selection.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-pos-muted/10">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-pos-background/50 text-pos-muted border-b border-pos-muted/10">
                        <th className="text-left py-2 px-3 font-medium">
                          Product
                        </th>
                        <th className="text-left py-2 px-3 font-medium">
                          Field
                        </th>
                        <th className="text-right py-2 px-3 font-medium">
                          Current
                        </th>
                        <th className="text-right py-2 px-3 font-medium">
                          New
                        </th>
                        <th className="text-right py-2 px-3 font-medium text-pos-success">
                          Change
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedPreview.map((group) => (
                        <ProductPreviewRows
                          key={group.name}
                          group={group}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </div>

        {/* ── Footer actions ── */}
        <div className="flex items-center gap-3 p-6 pt-4 border-t border-pos-muted/20 shrink-0">
          <button
            onClick={handleCancel}
            className="flex-1 px-4 py-3 border border-pos-muted/30 text-pos-text rounded-xl font-medium text-sm touch-target hover:bg-pos-background transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={!canApply}
            className="flex-1 px-4 py-3 bg-pos-accent text-white rounded-xl font-bold text-sm touch-target hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {applying
              ? "Applying…"
              : hasPreview
                ? `Apply — ${preview!.length} field(s)`
                : "Apply"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Product preview rows sub-component
// ──────────────────────────────────────────────

function ProductPreviewRows({ group }: { group: ProductGroup }) {
  const rows: BulkPreviewItem[] = [];
  if (group.cost) rows.push(group.cost);
  if (group.selling) rows.push(group.selling);

  const rowSpan = rows.length;

  return (
    <>
      {rows.map((item, idx) => (
        <tr
          key={`${item.productId}-${item.field}`}
          className="border-b border-pos-muted/5 hover:bg-pos-background/30 transition-colors"
        >
          {idx === 0 && (
            <td
              className="py-2 px-3 font-medium text-pos-text"
              rowSpan={rowSpan}
            >
              {item.name}
            </td>
          )}
          <td className="py-2 px-3 text-pos-muted capitalize">
            {item.field === "cost" ? "Cost" : "Selling"}
          </td>
          <td className="py-2 px-3 text-right font-mono text-pos-muted">
            ${item.currentPrice.toFixed(2)}
          </td>
          <td className="py-2 px-3 text-right font-mono text-pos-text font-semibold">
            ${item.newPrice.toFixed(2)}
          </td>
          <td className="py-2 px-3 text-right font-mono text-pos-success">
            +${(item.newPrice - item.currentPrice).toFixed(2)}
          </td>
        </tr>
      ))}
    </>
  );
}
