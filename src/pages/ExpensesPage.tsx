import { useState, useMemo, useCallback } from "react";
import { useActiveStore } from "@/store/context";
import {
  useExpensesStore,
  type Expense,
  type ExpenseCategory,
  type PaymentMethod,
  type MonthlySummary,
  EXPENSE_CATEGORIES,
  CATEGORY_LABELS,
} from "@/store/expenses";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { exportTableToPdf, exportToExcel, type ExportColumn } from "@/lib/export-utils";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

type Tab = "register" | "summary";

type FormData = {
  description: string;
  amount: string;
  category: ExpenseCategory;
  date: string;
  paymentMethod: PaymentMethod;
};

const EMPTY_FORM: FormData = {
  description: "",
  amount: "",
  category: "Varios",
  date: new Date().toISOString().slice(0, 10),
  paymentMethod: "cash",
};

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export default function ExpensesPage() {
  const { storeId } = useActiveStore();
  const expenses = useExpensesStore((s) => s.expenses);
  const addExpense = useExpensesStore((s) => s.addExpense);
  const updateExpense = useExpensesStore((s) => s.updateExpense);
  const deleteExpense = useExpensesStore((s) => s.deleteExpense);
  const getExpensesByMonth = useExpensesStore((s) => s.getExpensesByMonth);
  const getMonthlySummary = useExpensesStore((s) => s.getMonthlySummary);

  // ── Tab state ──
  const [activeTab, setActiveTab] = useState<Tab>("register");

  // ── Form state ──
  const [form, setForm] = useState<FormData>({ ...EMPTY_FORM });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);

  // ── Summary date picker ──
  const now = new Date();
  const [summaryYear, setSummaryYear] = useState(now.getFullYear());
  const [summaryMonth, setSummaryMonth] = useState(now.getMonth() + 1);

  // ── Current month expenses for the register tab ──
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const monthExpenses = useMemo(
    () => getExpensesByMonth(currentYear, currentMonth, storeId),
    [expenses, currentYear, currentMonth, storeId, getExpensesByMonth],
  );

  // ── Monthly summary data ──
  const summary = useMemo(
    () => getMonthlySummary(summaryYear, summaryMonth, storeId),
    [expenses, summaryYear, summaryMonth, storeId, getMonthlySummary],
  );

  // Chart data: categories with non-zero totals
  const chartData = useMemo(() => {
    return EXPENSE_CATEGORIES.filter(
      (cat) => summary.byCategory[cat].total > 0,
    ).map((cat) => ({
      category: CATEGORY_LABELS[cat],
      total: summary.byCategory[cat].total,
    }));
  }, [summary]);

  // ── Export handlers ──

  const expenseRegisterColumns: ExportColumn[] = [
    { header: "Fecha", key: "fecha" },
    { header: "Categoría", key: "categoria" },
    { header: "Descripción", key: "descripcion" },
    { header: "Monto", key: "monto" },
    { header: "Pago", key: "pago" },
  ];

  const exportRegisterPdf = useCallback(() => {
    const data = monthExpenses.map((exp) => {
      const [y, m, d] = exp.date.split("-");
      return {
        fecha: `${d}/${m}`,
        categoria: CATEGORY_LABELS[exp.category],
        descripcion: exp.description,
        monto: `$${exp.amount.toFixed(2)}`,
        pago: paymentLabel(exp.paymentMethod),
      };
    });
    exportTableToPdf(data, expenseRegisterColumns, `Gastos del Mes`);
  }, [monthExpenses]);

  const exportRegisterExcel = useCallback(() => {
    const data = monthExpenses.map((exp) => ({
      fecha: exp.date,
      categoria: CATEGORY_LABELS[exp.category],
      descripcion: exp.description,
      monto: exp.amount,
      pago: paymentLabel(exp.paymentMethod),
    }));
    exportToExcel(data, expenseRegisterColumns, "Gastos");
  }, [monthExpenses]);

  const summaryColumns: ExportColumn[] = [
    { header: "Categoría", key: "categoria" },
    { header: "Total", key: "total" },
    { header: "Cantidad", key: "cantidad" },
  ];

  const exportSummaryPdf = useCallback(() => {
    const data = EXPENSE_CATEGORIES.filter(
      (cat) => summary.byCategory[cat].total > 0,
    ).map((cat) => ({
      categoria: CATEGORY_LABELS[cat],
      total: `$${summary.byCategory[cat].total.toFixed(2)}`,
      cantidad: summary.byCategory[cat].count,
    }));
    exportTableToPdf(
      data,
      summaryColumns,
      `Resumen ${months[summaryMonth - 1]} ${summaryYear}`,
    );
  }, [summary, summaryYear, summaryMonth]);

  const exportSummaryExcel = useCallback(() => {
    const data = EXPENSE_CATEGORIES.filter(
      (cat) => summary.byCategory[cat].total > 0,
    ).map((cat) => ({
      categoria: CATEGORY_LABELS[cat],
      total: summary.byCategory[cat].total,
      cantidad: summary.byCategory[cat].count,
    }));
    exportToExcel(
      data,
      summaryColumns,
      `Resumen ${months[summaryMonth - 1]} ${summaryYear}`,
    );
  }, [summary, summaryYear, summaryMonth]);

  // ── Handlers ──

  function handleChange(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function openEditModal(expense: Expense) {
    setForm({
      description: expense.description,
      amount: String(expense.amount),
      category: expense.category,
      date: expense.date,
      paymentMethod: expense.paymentMethod,
    });
    setEditingId(expense.id);
    setShowModal(true);
  }

  function openAddForm() {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
    setShowModal(true);
  }

  function handleSave() {
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) return;
    if (!form.description.trim()) return;

    const data = {
      description: form.description.trim(),
      amount,
      category: form.category,
      date: form.date,
      paymentMethod: form.paymentMethod,
      storeId,
    };

    if (editingId !== null) {
      updateExpense(editingId, data);
    } else {
      addExpense(data);
    }

    setShowModal(false);
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
  }

  function handleDelete(id: number) {
    deleteExpense(id);
  }

  // ── Payment method label helper ──
  function paymentLabel(method: PaymentMethod): string {
    return method === "cash" ? "Efectivo" : "Tarjeta";
  }

  // ── Render ──

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto">
      {/* ── Tab bar ── */}
      <div className="flex gap-1 bg-pos-surface rounded-xl border border-pos-muted/10 p-1 self-start">
        <TabButton
          active={activeTab === "register"}
          onClick={() => setActiveTab("register")}
          label="Registrar Gasto"
        />
        <TabButton
          active={activeTab === "summary"}
          onClick={() => setActiveTab("summary")}
          label="Resumen Mensual"
        />
      </div>

      {activeTab === "register" ? (
        <RegisterTab
          monthExpenses={monthExpenses}
          onAdd={openAddForm}
          onEdit={openEditModal}
          onDelete={handleDelete}
          paymentLabel={paymentLabel}
          onExportPdf={exportRegisterPdf}
          onExportExcel={exportRegisterExcel}
        />
      ) : (
        <SummaryTab
          summaryYear={summaryYear}
          summaryMonth={summaryMonth}
          onYearChange={setSummaryYear}
          onMonthChange={setSummaryMonth}
          summary={summary}
          chartData={chartData}
          paymentLabel={paymentLabel}
          onExportPdf={exportSummaryPdf}
          onExportExcel={exportSummaryExcel}
        />
      )}

      {/* ── Add / Edit Modal ── */}
      {showModal && (
        <ExpenseModal
          form={form}
          editingId={editingId}
          onChange={handleChange}
          onSave={handleSave}
          onClose={() => {
            setShowModal(false);
            setEditingId(null);
            setForm({ ...EMPTY_FORM });
          }}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        active
          ? "bg-pos-secondary text-white shadow-sm"
          : "text-pos-muted hover:text-pos-text hover:bg-pos-background/50"
      }`}
    >
      {label}
    </button>
  );
}

function RegisterTab({
  monthExpenses,
  onAdd,
  onEdit,
  onDelete,
  paymentLabel,
  onExportPdf,
  onExportExcel,
}: {
  monthExpenses: Expense[];
  onAdd: () => void;
  onEdit: (e: Expense) => void;
  onDelete: (id: number) => void;
  paymentLabel: (m: PaymentMethod) => string;
  onExportPdf: () => void;
  onExportExcel: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Quick-add + export buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={onAdd}
          className="px-4 py-2 bg-pos-secondary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          + Nuevo Gasto
        </button>
        {monthExpenses.length > 0 && (
          <>
            <button
              onClick={onExportExcel}
              className="px-4 py-2 text-sm border border-pos-muted/30 text-pos-text rounded-lg hover:bg-pos-background/50 transition-colors"
            >
              Excel
            </button>
            <button
              onClick={onExportPdf}
              className="px-4 py-2 text-sm border border-pos-muted/30 text-pos-text rounded-lg hover:bg-pos-background/50 transition-colors"
            >
              PDF
            </button>
          </>
        )}
      </div>

      {/* Expenses table */}
      <div className="bg-pos-surface rounded-xl border border-pos-muted/10 p-4">
        <h3 className="text-sm font-semibold text-pos-text uppercase tracking-wide mb-3">
          Gastos de {months[new Date().getMonth()]} {new Date().getFullYear()}
        </h3>

        {monthExpenses.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm text-pos-muted italic">
              No hay gastos registrados este mes
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-pos-muted border-b border-pos-muted/20">
                  <th className="text-left py-2 pr-2 font-medium">Fecha</th>
                  <th className="text-left py-2 px-2 font-medium">Categoría</th>
                  <th className="text-left py-2 px-2 font-medium">Descripción</th>
                  <th className="text-right py-2 px-2 font-medium">Monto</th>
                  <th className="text-left py-2 px-2 font-medium">Pago</th>
                  <th className="text-center py-2 pl-2 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {monthExpenses.map((exp) => {
                  const [y, m, d] = exp.date.split("-");
                  return (
                    <tr
                      key={exp.id}
                      className="border-b border-pos-muted/10 hover:bg-pos-background/50"
                    >
                      <td className="py-2 pr-2 text-pos-muted font-mono text-xs">
                        {d}/{m}
                      </td>
                      <td className="py-2 px-2">
                        <span className="text-xs bg-pos-muted/10 text-pos-muted px-1.5 py-0.5 rounded-full">
                          {CATEGORY_LABELS[exp.category]}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-pos-text">
                        {exp.description}
                      </td>
                      <td className="py-2 px-2 text-right font-mono font-medium">
                        ${exp.amount.toFixed(2)}
                      </td>
                      <td className="py-2 px-2 text-xs text-pos-muted">
                        {paymentLabel(exp.paymentMethod)}
                      </td>
                      <td className="py-2 pl-2 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => onEdit(exp)}
                            className="text-xs text-pos-secondary hover:underline"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => onDelete(exp.id)}
                            className="text-xs text-red-500 hover:underline"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryTab({
  summaryYear,
  summaryMonth,
  onYearChange,
  onMonthChange,
  summary,
  chartData,
  paymentLabel,
  onExportPdf,
  onExportExcel,
}: {
  summaryYear: number;
  summaryMonth: number;
  onYearChange: (y: number) => void;
  onMonthChange: (m: number) => void;
  summary: MonthlySummary;
  chartData: { category: string; total: number }[];
  paymentLabel: (m: PaymentMethod) => string;
  onExportPdf: () => void;
  onExportExcel: () => void;
}) {
  const hasData = EXPENSE_CATEGORIES.some(
    (cat) => summary.byCategory[cat].total > 0,
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Month/Year selector + export */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={summaryMonth}
          onChange={(e) => onMonthChange(Number(e.target.value))}
          className="text-sm border border-pos-muted/20 rounded-lg px-3 py-1.5 bg-pos-surface text-pos-text focus:outline-none focus:ring-2 focus:ring-pos-secondary"
        >
          {months.map((name, i) => (
            <option key={i + 1} value={i + 1}>
              {name}
            </option>
          ))}
        </select>
        <select
          value={summaryYear}
          onChange={(e) => onYearChange(Number(e.target.value))}
          className="text-sm border border-pos-muted/20 rounded-lg px-3 py-1.5 bg-pos-surface text-pos-text focus:outline-none focus:ring-2 focus:ring-pos-secondary"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        {hasData && (
          <>
            <button
              onClick={onExportExcel}
              className="px-4 py-2 text-sm border border-pos-muted/30 text-pos-text rounded-lg hover:bg-pos-background/50 transition-colors"
            >
              Excel
            </button>
            <button
              onClick={onExportPdf}
              className="px-4 py-2 text-sm border border-pos-muted/30 text-pos-text rounded-lg hover:bg-pos-background/50 transition-colors"
            >
              PDF
            </button>
          </>
        )}
      </div>

      {/* Summary by category */}
      <div className="bg-pos-surface rounded-xl border border-pos-muted/10 p-4">
        <h3 className="text-sm font-semibold text-pos-text uppercase tracking-wide mb-3">
          Resumen por Categoría
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-pos-muted border-b border-pos-muted/20">
                <th className="text-left py-2 pr-2 font-medium">Categoría</th>
                <th className="text-right py-2 px-2 font-medium">Total</th>
                <th className="text-right py-2 pl-2 font-medium">Cantidad</th>
              </tr>
            </thead>
            <tbody>
              {EXPENSE_CATEGORIES.map((cat) => {
                const data = summary.byCategory[cat];
                return (
                  <tr
                    key={cat}
                    className="border-b border-pos-muted/10 hover:bg-pos-background/50"
                  >
                    <td className="py-2 pr-2 text-pos-text">
                      {CATEGORY_LABELS[cat]}
                    </td>
                    <td className="py-2 px-2 text-right font-mono">
                      ${data.total.toFixed(2)}
                    </td>
                    <td className="py-2 pl-2 text-right font-mono text-pos-muted">
                      {data.count}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-pos-muted/20 font-bold">
                <td className="py-2 pr-2 text-pos-text">Total</td>
                <td className="py-2 px-2 text-right font-mono">
                  ${summary.total.toFixed(2)}
                </td>
                <td className="py-2 pl-2 text-right font-mono text-pos-muted">
                  {EXPENSE_CATEGORIES.reduce(
                    (sum, cat) => sum + summary.byCategory[cat].count,
                    0,
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Breakdown by payment method */}
      <div className="bg-pos-surface rounded-xl border border-pos-muted/10 p-4">
        <h3 className="text-sm font-semibold text-pos-text uppercase tracking-wide mb-3">
          Desglose por Método de Pago
        </h3>
        <div className="space-y-2">
          {(["cash", "card"] as PaymentMethod[]).map((method) => (
            <div
              key={method}
              className="flex items-center justify-between py-1"
            >
              <span className="text-sm text-pos-text">
                {paymentLabel(method)}
              </span>
              <div className="text-right">
                <span className="text-sm font-mono font-medium">
                  ${summary.byPaymentMethod[method].total.toFixed(2)}
                </span>
                <span className="text-xs text-pos-muted ml-2">
                  ({summary.byPaymentMethod[method].count} operaciones)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bar chart */}
      {chartData.length > 0 && (
        <div className="bg-pos-surface rounded-xl border border-pos-muted/10 p-4">
          <h3 className="text-sm font-semibold text-pos-text uppercase tracking-wide mb-3">
            Gastos por Categoría
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis
                  dataKey="category"
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `$${v}`}
                />
                <Tooltip
                  formatter={(value: number) => [`$${value.toFixed(2)}`, "Total"]}
                  contentStyle={{
                    backgroundColor: "var(--color-surface, #1f2937)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Add / Edit Modal
// ──────────────────────────────────────────────

function ExpenseModal({
  form,
  editingId,
  onChange,
  onSave,
  onClose,
}: {
  form: FormData;
  editingId: number | null;
  onChange: (field: keyof FormData, value: string) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const isValid =
    form.description.trim().length > 0 &&
    parseFloat(form.amount) > 0 &&
    form.date.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-pos-surface rounded-xl border border-pos-muted/10 p-6 w-full max-w-md mx-4 shadow-xl">
        <h2 className="text-base font-semibold text-pos-text mb-4">
          {editingId !== null ? "Editar Gasto" : "Nuevo Gasto"}
        </h2>

        <div className="space-y-4">
          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-pos-muted mb-1">
              Descripción
            </label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => onChange("description", e.target.value)}
              className="w-full border border-pos-muted/20 rounded-lg px-3 py-2 text-sm bg-pos-background text-pos-text focus:outline-none focus:ring-2 focus:ring-pos-secondary"
              placeholder="Ej: Compra de insumos"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-medium text-pos-muted mb-1">
              Monto
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={form.amount}
              onChange={(e) => onChange("amount", e.target.value)}
              className="w-full border border-pos-muted/20 rounded-lg px-3 py-2 text-sm bg-pos-background text-pos-text focus:outline-none focus:ring-2 focus:ring-pos-secondary"
              placeholder="0.00"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-pos-muted mb-1">
              Categoría
            </label>
            <select
              value={form.category}
              onChange={(e) =>
                onChange("category", e.target.value as ExpenseCategory)
              }
              className="w-full border border-pos-muted/20 rounded-lg px-3 py-2 text-sm bg-pos-background text-pos-text focus:outline-none focus:ring-2 focus:ring-pos-secondary"
            >
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-medium text-pos-muted mb-1">
              Fecha
            </label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => onChange("date", e.target.value)}
              className="w-full border border-pos-muted/20 rounded-lg px-3 py-2 text-sm bg-pos-background text-pos-text focus:outline-none focus:ring-2 focus:ring-pos-secondary"
            />
          </div>

          {/* Payment method */}
          <div>
            <label className="block text-xs font-medium text-pos-muted mb-2">
              Método de Pago
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cash"
                  checked={form.paymentMethod === "cash"}
                  onChange={() => onChange("paymentMethod", "cash")}
                  className="text-pos-secondary focus:ring-pos-secondary"
                />
                <span className="text-sm text-pos-text">Efectivo</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="card"
                  checked={form.paymentMethod === "card"}
                  onChange={() => onChange("paymentMethod", "card")}
                  className="text-pos-secondary focus:ring-pos-secondary"
                />
                <span className="text-sm text-pos-text">Tarjeta</span>
              </label>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-pos-muted hover:text-pos-text transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            disabled={!isValid}
            className="px-4 py-2 bg-pos-secondary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {editingId !== null ? "Guardar Cambios" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

const months = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
