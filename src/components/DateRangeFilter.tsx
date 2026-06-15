import { useState, useCallback, useMemo } from "react";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type Preset = "today" | "this-week" | "this-month" | "this-quarter" | "all";

export type DateRange = {
  from: Date | null;
  to: Date | null;
};

type DateRangeFilterProps = {
  value: DateRange;
  onChange: (range: DateRange, preset: Preset | "custom") => void;
};

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function presetRange(preset: Preset): DateRange {
  const now = new Date();

  switch (preset) {
    case "today": {
      return { from: startOfDay(now), to: endOfDay(now) };
    }
    case "this-week": {
      const dayOfWeek = now.getDay(); // 0=Sun
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7)); // go back to Monday
      return { from: startOfDay(monday), to: endOfDay(now) };
    }
    case "this-month": {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: startOfDay(first), to: endOfDay(now) };
    }
    case "this-quarter": {
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
      const first = new Date(now.getFullYear(), quarterStartMonth, 1);
      return { from: startOfDay(first), to: endOfDay(now) };
    }
    case "all":
    default: {
      return { from: null, to: null };
    }
  }
}

const PRESETS: { id: Preset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "this-week", label: "This Week" },
  { id: "this-month", label: "This Month" },
  { id: "this-quarter", label: "This Quarter" },
  { id: "all", label: "All Time" },
];

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export default function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const [activePreset, setActivePreset] = useState<Preset | "custom">("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  // Set initial value to "all" on mount if not already
  const handlePresetClick = useCallback(
    (preset: Preset) => {
      setActivePreset(preset);
      setCustomFrom("");
      setCustomTo("");
      onChange(presetRange(preset), preset);
    },
    [onChange],
  );

  const handleCustomApply = useCallback(() => {
    if (!customFrom) return;

    const from = startOfDay(new Date(customFrom + "T00:00:00"));
    const to = customTo
      ? endOfDay(new Date(customTo + "T00:00:00"))
      : endOfDay(from);

    setActivePreset("custom");
    onChange({ from, to }, "custom");
  }, [customFrom, customTo, onChange]);

  // Format dates for input[type=date] default values
  const presetLabel = useMemo(() => {
    if (activePreset === "custom") return "Custom Range";
    return PRESETS.find((p) => p.id === activePreset)?.label ?? "";
  }, [activePreset]);

  return (
    <div className="flex flex-wrap items-end gap-3">
      {/* ── Preset buttons ── */}
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => handlePresetClick(p.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors touch-target ${
              activePreset === p.id
                ? "bg-pos-secondary text-white shadow-sm"
                : "bg-pos-background text-pos-muted hover:bg-pos-secondary/10 hover:text-pos-secondary"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* ── Custom range ── */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-pos-muted whitespace-nowrap">Custom:</label>
        <input
          type="date"
          value={customFrom}
          onChange={(e) => setCustomFrom(e.target.value)}
          className="px-2 py-1.5 text-xs rounded-lg border border-pos-muted/20 bg-pos-surface text-pos-text focus:outline-none focus:ring-2 focus:ring-pos-secondary"
          aria-label="From date"
        />
        <span className="text-pos-muted text-xs">–</span>
        <input
          type="date"
          value={customTo}
          onChange={(e) => setCustomTo(e.target.value)}
          className="px-2 py-1.5 text-xs rounded-lg border border-pos-muted/20 bg-pos-surface text-pos-text focus:outline-none focus:ring-2 focus:ring-pos-secondary"
          aria-label="To date"
        />
        <button
          onClick={handleCustomApply}
          disabled={!customFrom}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-pos-secondary text-white hover:bg-pos-secondary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed touch-target"
        >
          Apply
        </button>
      </div>

      {/* ── Active range label ── */}
      {value.from && (
        <span className="text-xs text-pos-muted ml-1">
          {presetLabel}: {value.from.toLocaleDateString()}
          {value.to && value.to.toDateString() !== value.from.toDateString()
            ? ` – ${value.to.toLocaleDateString()}`
            : ""}
        </span>
      )}
    </div>
  );
}
