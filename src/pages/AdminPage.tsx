import { useState, useRef, useEffect } from "react";
import { useAppStore, useAuthStore, useAdminStore } from "@/store";
import BrandList from "@/components/BrandList";
import CategoryList from "@/components/CategoryList";
import BulkPriceModal from "@/components/BulkPriceModal";
import PlantillasSection from "@/components/PlantillasSection";
import { exportBackup, downloadBackup, importBackup } from "@/lib/backup";
import { runSeeder } from "@/lib/seeder";

// ──────────────────────────────────────────────
// Admin section definitions
// ──────────────────────────────────────────────

type SectionId = "categories" | "brands" | "bulk-price" | "backup" | "settings" | "plantillas";

type SectionDef = {
  id: SectionId;
  label: string;
  description: string;
  icon: React.ReactNode;
};

function CategoriesIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
      <path d="M4 4h6v6H4z" />
      <path d="M14 4h6v6h-6z" />
      <path d="M4 14h6v6H4z" />
      <path d="M14 14h6v6h-6z" />
    </svg>
  );
}

function BrandsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
      <path d="M9 5H2v7l6.29 6.29a1 1 0 0 0 1.42 0l5.58-5.58a1 1 0 0 0 0-1.42L9 5z" />
      <circle cx="5.5" cy="6.5" r="1.5" fill="currentColor" opacity="0.3" />
      <path d="M16 5h6v6" />
      <path d="M19 2l-5 5" />
    </svg>
  );
}

function BulkPriceIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
      <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      <circle cx="17" cy="17" r="4" fill="currentColor" opacity="0.15" />
    </svg>
  );
}

function BackupIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
      <circle cx="12" cy="16" r="1.5" fill="currentColor" opacity="0.3" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function PlantillasIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

const SECTIONS: SectionDef[] = [
  {
    id: "categories",
    label: "Categorías",
    description: "gestioná tus categorías de productos",
    icon: <CategoriesIcon />,
  },
  {
    id: "brands",
    label: "Marcas",
    description: "gestioná tus marcas de productos",
    icon: <BrandsIcon />,
  },
  {
    id: "bulk-price",
    label: "Precio Masivo",
    description: "aplicá aumentos a múltiples productos",
    icon: <BulkPriceIcon />,
  },
  {
    id: "backup",
    label: "Respaldos",
    description: "exportá o restaurá tus datos",
    icon: <BackupIcon />,
  },
  {
    id: "settings",
    label: "Configuración",
    description: "tema, usuarios y preferencias",
    icon: <SettingsIcon />,
  },
  {
    id: "plantillas",
    label: "Plantillas",
    description: "personalizá el formato de impresión",
    icon: <PlantillasIcon />,
  },
];

// ──────────────────────────────────────────────
// Color accents per section
// ──────────────────────────────────────────────

const ACCENTS: Record<string, { bg: string; text: string; bar: string }> = {
  categories:  { bg: "bg-rose-500/8",    text: "text-rose-600",    bar: "#e11d48" },
  brands:      { bg: "bg-violet-500/8",  text: "text-violet-600",  bar: "#8b5cf6" },
  "bulk-price": { bg: "bg-emerald-500/8", text: "text-emerald-600", bar: "#10b981" },
  backup:      { bg: "bg-amber-500/8",   text: "text-amber-600",   bar: "#f59e0b" },
  settings:    { bg: "bg-sky-500/8",     text: "text-sky-600",     bar: "#0ea5e9" },
  plantillas:  { bg: "bg-indigo-500/8",   text: "text-indigo-600",  bar: "#6366f1" },
};

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export default function AdminPage() {
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);

  // Escape goes back to root admin
  useEffect(() => {
    if (!activeSection) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setActiveSection(null);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activeSection]);

  // Show card grid
  if (!activeSection) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-pos-text mb-1">
          Administración
        </h2>
        <p className="text-sm text-pos-muted mb-5">
          seleccioná una sección para configurar
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {SECTIONS.map((sec, i) => {
            const accent = ACCENTS[sec.id];
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className="card-enter relative flex items-start gap-4 rounded-xl border border-pos-muted/10 bg-pos-surface p-4 md:p-5 shadow-sm hover:shadow-md active:scale-[0.98] transition-all duration-200 text-left cursor-pointer group overflow-hidden"
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                {/* Accent bar */}
                <span
                  className="absolute top-0 left-0 right-0 h-0.5 opacity-80 group-hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: accent.bar }}
                />

                {/* Icon */}
                <span className={`shrink-0 flex items-center justify-center w-11 h-11 md:w-12 md:h-12 rounded-xl ${accent.bg} ${accent.text} mt-0.5`}>
                  {sec.icon}
                </span>

                {/* Text */}
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-pos-text mb-0.5">
                    {sec.label}
                  </h3>
                  <p className="text-xs text-pos-muted/80 leading-snug">
                    {sec.description}
                  </p>
                </div>

                {/* Arrow */}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-pos-muted/40 shrink-0 mt-1.5 group-hover:text-pos-muted/70 transition-colors">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Show section detail with back button
  return (
    <div>
      {/* Breadcrumb */}
      <button
        onClick={() => setActiveSection(null)}
        className="flex items-center gap-1.5 text-sm text-pos-muted hover:text-pos-text transition-colors mb-4 touch-target"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Volver
      </button>

      {/* Section title */}
      {activeSection === "categories" && <CategoriesSection />}
      {activeSection === "brands" && <BrandsSection />}
      {activeSection === "bulk-price" && <BulkPriceSection />}
      {activeSection === "backup" && <BackupSection />}
      {activeSection === "settings" && <SettingsSection />}
      {activeSection === "plantillas" && <PlantillasSection />}
    </div>
  );
}

// ──────────────────────────────────────────────
// Section detail components
// ──────────────────────────────────────────────

function CategoriesSection() {
  return (
    <div>
      <h3 className="text-base font-semibold text-pos-text mb-4">Categorías</h3>
      <div className="max-w-2xl">
        <CategoryList />
      </div>
    </div>
  );
}

function BrandsSection() {
  return (
    <div>
      <h3 className="text-base font-semibold text-pos-text mb-4">Marcas</h3>
      <div className="max-w-2xl">
        <BrandList />
      </div>
    </div>
  );
}

function BulkPriceSection() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
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

      {showModal && <BulkPriceModal onClose={() => setShowModal(false)} />}
    </div>
  );
}

function BackupSection() {
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
      showNotification(`Respaldo restaurado — ${result.tables} tablas, ${result.rows} filas — recargando...`);
      // Force full reload so all stores re-read from the fresh DB data
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      showNotification(err instanceof Error ? err.message : "Error al restaurar el respaldo");
      setRestoring(false);
      e.target.value = "";
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <h3 className="text-base font-semibold text-pos-text mb-4">Respaldos</h3>
      <p className="text-sm text-pos-muted">
        Exportá una copia de seguridad o restaurá datos desde un archivo .json.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-pos-muted/10 bg-pos-surface p-5">
          <h4 className="text-sm font-semibold text-pos-text mb-1">Exportar</h4>
          <p className="text-xs text-pos-muted mb-4">
            Descargá un .json con todos los datos.
          </p>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full px-4 py-2 bg-pos-secondary text-white rounded-lg text-sm font-medium touch-target hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {exporting ? "Exportando…" : "Descargar Respaldo"}
          </button>
        </div>

        <div className="rounded-xl border border-pos-muted/10 bg-pos-surface p-5">
          <h4 className="text-sm font-semibold text-pos-text mb-1">Restaurar</h4>
          <p className="text-xs text-pos-muted mb-4">
            Reemplazá todos los datos actuales.
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
            className="w-full px-4 py-2 bg-pos-danger text-white rounded-lg text-sm font-medium touch-target hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {restoring ? "Restaurando…" : "Restaurar Respaldo"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingsSection() {
  const theme = useAdminStore((s) => s.theme);
  const toggleTheme = useAdminStore((s) => s.toggleTheme);
  const setPage = useAppStore((s) => s.setPage);
  const showNotification = useAppStore((s) => s.showNotification);
  const currentUser = useAuthStore((s) => s.currentUser);
  const [seeding, setSeeding] = useState(false);

  async function handleSeeder() {
    const confirmed = confirm(
      "⚠️ Datos de prueba\n\nEsta acción va a ELIMINAR todos los datos actuales y generar:\n" +
      `• 8000 productos\n• 2000 clientes\n• 200 proveedores\n• 1000 pedidos\n• 5000 comprobantes\n• 500 gastos\n\n` +
      "¿Estás seguro?",
    );
    if (!confirmed) return;

    setSeeding(true);
    try {
      await runSeeder();
      showNotification("Seeder completado. Recargando…");
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      showNotification(err instanceof Error ? err.message : "Error en seeder");
      setSeeding(false);
    }
  }

  return (
    <div>
      <h3 className="text-base font-semibold text-pos-text mb-4">Configuración</h3>
      <div className="max-w-md space-y-4">
        {/* User info */}
        <div className="rounded-xl border border-pos-muted/10 bg-pos-surface p-4">
          <h4 className="text-xs font-semibold text-pos-muted uppercase tracking-wider mb-3">
            Usuario
          </h4>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-pos-secondary/15 flex items-center justify-center text-pos-secondary text-sm font-semibold">
                {currentUser?.name?.charAt(0).toUpperCase() ?? "?"}
              </div>
              <div>
                <span className="text-sm font-medium text-pos-text block">
                  {currentUser?.name ?? "—"}
                </span>
                <span className="text-xs text-pos-muted">
                  {currentUser?.role === "admin" ? "Administrador" : "Personalizado"}
                </span>
              </div>
            </div>
            <button
              onClick={() => setPage("user-management")}
              className="text-xs px-3 py-1.5 bg-pos-secondary text-white rounded-lg font-medium touch-target hover:opacity-90 transition-opacity"
            >
              Gestionar
            </button>
          </div>
        </div>

        {/* Theme */}
        <div className="rounded-xl border border-pos-muted/10 bg-pos-surface p-4">
          <h4 className="text-xs font-semibold text-pos-muted uppercase tracking-wider mb-3">
            Tema
          </h4>
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between p-3 bg-pos-background/50 rounded-xl touch-target hover:bg-pos-background/80 transition-colors"
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
              <div className={`w-10 h-6 rounded-full transition-colors ${theme === "dark" ? "bg-pos-secondary" : "bg-pos-muted/30"} relative`}>
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${theme === "dark" ? "translate-x-[18px]" : "translate-x-0.5"}`} />
              </div>
              <span className="text-xs text-pos-muted">Oscuro</span>
            </div>
          </button>
        </div>

        {/* Test data seeder */}
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <h4 className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1">
            Datos de prueba
          </h4>
          <p className="text-xs text-pos-muted mb-3">
            Generá datos masivos para probar performance. Todos los datos actuales se eliminan.
          </p>
          <button
            onClick={handleSeeder}
            disabled={seeding}
            className="w-full px-4 py-2 text-sm font-medium rounded-lg border border-amber-500/30 text-amber-700 bg-amber-500/10 touch-target hover:bg-amber-500/20 disabled:opacity-50 transition-opacity"
          >
            {seeding ? "Generando datos…" : "Generar datos de prueba"}
          </button>
        </div>
      </div>
    </div>
  );
}
