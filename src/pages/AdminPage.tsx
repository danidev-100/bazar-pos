import { useState, useRef } from "react";
import { useAppStore, useAuthStore, useAdminStore } from "@/store";
import BrandList from "@/components/BrandList";
import BulkPriceModal from "@/components/BulkPriceModal";
import { exportBackup, downloadBackup, importBackup } from "@/lib/backup";

// ──────────────────────────────────────────────
// Tab definitions
// ──────────────────────────────────────────────

type AdminTab = "brands" | "bulk-price" | "settings" | "backup";

const TABS: { id: AdminTab; label: string }[] = [
  { id: "brands", label: "Marcas" },
  { id: "bulk-price", label: "Precio Masivo" },
  { id: "backup", label: "Respaldos" },
  { id: "settings", label: "Configuración" },
];

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>("brands");

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-pos-muted/20 mb-4">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === tab.id
                ? "bg-pos-surface text-pos-secondary border-b-2 border-pos-secondary"
                : "text-pos-muted hover:text-pos-text hover:bg-pos-background/50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "brands" && <BrandsTab />}
        {activeTab === "bulk-price" && <BulkPriceTab />}
        {activeTab === "backup" && <BackupTab />}
        {activeTab === "settings" && <SettingsTab />}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Brands Tab
// ──────────────────────────────────────────────

function BrandsTab() {
  return (
    <div className="max-w-2xl">
      <BrandList />
    </div>
  );
}

// ──────────────────────────────────────────────
// Bulk Price Tab
// ──────────────────────────────────────────────

function BulkPriceTab() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <svg
        className="w-16 h-16 text-pos-muted/40 mb-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
        />
      </svg>
      <h3 className="text-lg font-medium text-pos-text mb-1">
        Aumento de Precio Masivo
      </h3>
      <p className="text-sm text-pos-muted/70 max-w-sm mb-6">
        Aplicá aumentos porcentuales a múltiples productos de una sola vez.
        Filtralos por categoría, marca o aplicá a todos.
      </p>
      <button
        onClick={() => setShowModal(true)}
        className="px-6 py-2.5 bg-pos-secondary text-white rounded-lg font-medium text-sm touch-target hover:opacity-90 transition-opacity"
      >
        Iniciar Aumento Masivo
      </button>

      {showModal && (
        <BulkPriceModal onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Backup Tab
// ──────────────────────────────────────────────

function BackupTab() {
  const showNotification = useAppStore((s) => s.showNotification);
  const [restoring, setRestoring] = useState(false);
  const [exporting, setExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleExport() {
    setExporting(true);
    try {
      const data = await exportBackup();
      downloadBackup(data);
      showNotification("Respaldo descargado correctamente");
    } catch {
      showNotification("Error al generar el respaldo");
    } finally {
      setExporting(false);
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm("¿Restaurar este respaldo? Se van a reemplazar TODOS los datos actuales. Esta acción no se puede deshacer.")) {
      e.target.value = "";
      return;
    }

    setRestoring(true);
    try {
      const result = await importBackup(file);
      showNotification(`Respaldo restaurado — ${result.tables} tablas, ${result.rows} filas`);
    } catch (err) {
      showNotification(err instanceof Error ? err.message : "Error al restaurar el respaldo");
    } finally {
      setRestoring(false);
      e.target.value = "";
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      {/* Export */}
      <section>
        <h3 className="text-sm font-semibold text-pos-text uppercase tracking-wide mb-4">
          Descargar Respaldo
        </h3>
        <p className="text-sm text-pos-muted mb-4">
          Genera un archivo .json con todos los datos de la base: productos, ventas,
          clientes, proveedores, pedidos, facturas, etc.
        </p>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="px-6 py-2.5 bg-pos-secondary text-white rounded-lg font-medium text-sm touch-target hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {exporting ? "Exportando…" : "⬇ Descargar Respaldo"}
        </button>
      </section>

      <hr className="border-pos-muted/20" />

      {/* Import */}
      <section>
        <h3 className="text-sm font-semibold text-pos-text uppercase tracking-wide mb-4">
          Restaurar Respaldo
        </h3>
        <p className="text-sm text-pos-muted mb-4">
          Seleccioná un archivo .json de respaldo para restaurar.
          <span className="block text-pos-danger font-medium mt-1">
            ⚠ Esto reemplaza TODOS los datos actuales.
          </span>
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={restoring}
          className="px-6 py-2.5 bg-pos-danger text-white rounded-lg font-medium text-sm touch-target hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {restoring ? "Restaurando…" : "⬆ Restaurar Respaldo"}
        </button>
      </section>
    </div>
  );
}

// ──────────────────────────────────────────────
// Settings Tab
// ──────────────────────────────────────────────

function SettingsTab() {
  const theme = useAdminStore((s) => s.theme);
  const toggleTheme = useAdminStore((s) => s.toggleTheme);
  const setPage = useAppStore((s) => s.setPage);
  const currentUser = useAuthStore((s) => s.currentUser);

  return (
    <div className="max-w-md space-y-8">
      {/* User Management Section */}
      <section>
        <h3 className="text-sm font-semibold text-pos-text uppercase tracking-wide mb-4">
          Usuario
        </h3>
        <div className="flex items-center justify-between p-3 bg-pos-background/50 rounded-xl border border-pos-muted/10">
          <div className="flex items-center gap-2">
            <span className="text-sm text-pos-muted">Conectado como:</span>
            <span className="text-sm font-medium text-pos-text">
              {currentUser?.name ?? "—"}
            </span>
          </div>
          <button
            onClick={() => setPage("user-management")}
            className="px-4 py-2 bg-pos-secondary text-white rounded-lg text-sm font-medium touch-target hover:opacity-90 transition-opacity"
          >
            Gestionar Usuarios
          </button>
        </div>
      </section>

      {/* Theme Section */}
      <section>
        <h3 className="text-sm font-semibold text-pos-text uppercase tracking-wide mb-4">
          Tema
        </h3>
        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-between p-3 bg-pos-background/50 rounded-xl border border-pos-muted/10 touch-target hover:bg-pos-background/80 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-lg">
              {theme === "light" ? "☀️" : "🌙"}
            </span>
            <span className="text-sm font-medium text-pos-text">
              {theme === "light" ? "Modo Claro" : "Modo Oscuro"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-pos-muted">Claro</span>
            <div
              className={`w-10 h-6 rounded-full transition-colors ${
                theme === "dark"
                  ? "bg-pos-secondary"
                  : "bg-pos-muted/30"
              } relative`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                  theme === "dark"
                    ? "translate-x-[18px]"
                    : "translate-x-0.5"
                }`}
              />
            </div>
            <span className="text-xs text-pos-muted">Oscuro</span>
          </div>
        </button>
      </section>
    </div>
  );
}
