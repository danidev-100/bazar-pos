import { useState } from "react";
import { useAdminStore } from "@/store/admin";
import { useAppStore } from "@/store";
import BrandList from "@/components/BrandList";
import BulkPriceModal from "@/components/BulkPriceModal";

// ──────────────────────────────────────────────
// Tab definitions
// ──────────────────────────────────────────────

type AdminTab = "brands" | "bulk-price" | "settings";

const TABS: { id: AdminTab; label: string }[] = [
  { id: "brands", label: "Marcas" },
  { id: "bulk-price", label: "Precio Masivo" },
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
        Bulk Price Increase
      </h3>
      <p className="text-sm text-pos-muted/70 max-w-sm mb-6">
        Apply percentage-based price increases to multiple products at once.
        Filter by category, brand, or apply to all products.
      </p>
      <button
        onClick={() => setShowModal(true)}
        className="px-6 py-2.5 bg-pos-secondary text-white rounded-lg font-medium text-sm touch-target hover:opacity-90 transition-opacity"
      >
        Start Bulk Price Increase
      </button>

      {showModal && (
        <BulkPriceModal onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Settings Tab
// ──────────────────────────────────────────────

function SettingsTab() {
  const isUnlocked = useAdminStore((s) => s.isUnlocked);
  const pinHash = useAdminStore((s) => s.pinHash);
  const lock = useAdminStore((s) => s.lock);
  const setPin = useAdminStore((s) => s.setPin);
  const changePin = useAdminStore((s) => s.changePin);
  const theme = useAdminStore((s) => s.theme);
  const toggleTheme = useAdminStore((s) => s.toggleTheme);
  const setPage = useAppStore((s) => s.setPage);

  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmNewPin, setConfirmNewPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleChangePin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!newPin) {
      setError("Ingresá un nuevo PIN");
      return;
    }
    if (newPin !== confirmNewPin) {
      setError("Los PINs nuevos no coinciden");
      return;
    }

    setSaving(true);
    try {
      if (pinHash) {
        // Changing existing PIN — verify old one
        const ok = await changePin(currentPin, newPin);
        if (!ok) {
          setError("El PIN actual es incorrecto");
          return;
        }
      } else {
        // Setting first PIN
        await setPin(newPin);
      }

      setSuccess("PIN actualizado correctamente");
      setCurrentPin("");
      setNewPin("");
      setConfirmNewPin("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar el PIN");
    } finally {
      setSaving(false);
    }
  }

  function handleLock() {
    lock();
    setPage("pos");
  }

  return (
    <div className="max-w-md space-y-8">
      {/* PIN Change Section */}
      <section>
        <h3 className="text-sm font-semibold text-pos-text uppercase tracking-wide mb-4">
          {pinHash ? "Cambiar PIN" : "Configurar PIN"}
        </h3>

        {error && (
          <div className="bg-pos-danger/10 border border-pos-danger/30 text-pos-danger text-sm rounded-lg px-3 py-2 mb-3">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-3 py-2 mb-3">
            {success}
          </div>
        )}

        <form onSubmit={handleChangePin} className="space-y-3">
          {pinHash && (
            <div>
              <label
                htmlFor="settings-current-pin"
                className="block text-sm font-medium text-pos-text mb-1"
              >
                PIN Actual
              </label>
              <input
                id="settings-current-pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value)}
                placeholder="Ingresá el PIN actual"
                className="w-full border border-pos-muted/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pos-secondary touch-target"
                maxLength={10}
              />
            </div>
          )}

          <div>
            <label
              htmlFor="settings-new-pin"
              className="block text-sm font-medium text-pos-text mb-1"
            >
              Nuevo PIN
            </label>
            <input
              id="settings-new-pin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              placeholder="Ingresá el nuevo PIN"
              className="w-full border border-pos-muted/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pos-secondary touch-target"
              maxLength={10}
            />
          </div>

          <div>
            <label
              htmlFor="settings-confirm-pin"
              className="block text-sm font-medium text-pos-text mb-1"
            >
              Confirmar Nuevo PIN
            </label>
            <input
              id="settings-confirm-pin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={confirmNewPin}
              onChange={(e) => setConfirmNewPin(e.target.value)}
              placeholder="Confirmá el nuevo PIN"
              className="w-full border border-pos-muted/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pos-secondary touch-target"
              maxLength={10}
            />
          </div>

          <button
            type="submit"
            disabled={saving || !newPin || !confirmNewPin}
            className="w-full px-4 py-2 bg-pos-secondary text-white rounded-lg font-medium text-sm touch-target hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Guardando..." : pinHash ? "Cambiar PIN" : "Configurar PIN"}
          </button>
        </form>
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

      {/* Lock Admin */}
      {isUnlocked && (
        <section>
          <button
            onClick={handleLock}
            className="w-full px-4 py-2.5 bg-pos-danger/10 border border-pos-danger/30 text-pos-danger rounded-lg font-medium text-sm touch-target hover:bg-pos-danger/20"
          >
            Bloquear Admin
          </button>
        </section>
      )}
    </div>
  );
}
