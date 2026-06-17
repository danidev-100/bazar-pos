import { useAppStore, type Page } from "@/store";
import { useAuthStore, type Permission } from "@/store/auth";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type ModuleConfig = {
  label: string;
  icon: React.ReactNode;
  target: Page | null;
  permission?: Permission;
};

// ──────────────────────────────────────────────
// Inline SVG icon components
// ──────────────────────────────────────────────

function SaleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 01-8 0" />
    </svg>
  );
}

function PackageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
      <path d="M16.5 9.4L7.55 4.24" />
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <polyline points="3.29 7 12 12 20.71 7" />
      <line x1="12" y1="22" x2="12" y2="12" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
      <rect x="1" y="3" width="15" height="13" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
      <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

// ──────────────────────────────────────────────
// Module definitions
// ──────────────────────────────────────────────

const MODULES: ModuleConfig[] = [
  { label: "Ventas",       icon: <SaleIcon />,       target: "pos",       permission: "ventas" },
  { label: "Inventario",   icon: <PackageIcon />,    target: "products",  permission: "configuracion" },
  { label: "Clientes",     icon: <UsersIcon />,      target: "customers", permission: "clientes" },
  { label: "Proveedores",  icon: <TruckIcon />,      target: null },
  { label: "Pedidos",      icon: <ClipboardIcon />,  target: null },
  { label: "Estadísticas", icon: <ChartIcon />,      target: "stats",    permission: "estadisticas" },
  { label: "Configuración",icon: <GearIcon />,       target: "admin",    permission: "configuracion" },
  { label: "Usuarios",     icon: <ShieldIcon />,     target: "admin",    permission: "configuracion" },
];

// ──────────────────────────────────────────────
// ModuleCard sub-component
// ──────────────────────────────────────────────

function ModuleCard({ label, icon, target }: ModuleConfig) {
  const setPage = useAppStore((s) => s.setPage);
  const isDisabled = target === null;

  if (isDisabled) {
    return (
      <button
        disabled
        className="relative flex flex-col items-center justify-center gap-2 rounded-xl border border-pos-muted/10 bg-pos-surface p-5 opacity-50 cursor-not-allowed transition-colors"
      >
        <span className="text-pos-muted">{icon}</span>
        <span className="text-sm font-medium text-pos-text">{label}</span>
        <span className="absolute top-1.5 right-1.5 text-[10px] font-semibold uppercase tracking-wide text-pos-muted bg-pos-background px-1.5 py-0.5 rounded">
          Próximamente
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={() => setPage(target)}
      className="flex flex-col items-center justify-center gap-2 rounded-xl border border-pos-muted/10 bg-pos-surface p-5 hover:bg-pos-secondary hover:text-white hover:shadow-lg hover:scale-[1.03] active:scale-[0.98] transition-all duration-200 cursor-pointer"
    >
      <span className="text-pos-text group-hover:text-white">{icon}</span>
      <span className="text-sm font-medium text-pos-text group-hover:text-white">{label}</span>
    </button>
  );
}

// ──────────────────────────────────────────────
// Dashboard page
// ──────────────────────────────────────────────

export default function DashboardPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const currentUser = useAuthStore((s) => s.currentUser);

  // Filter modules by permission
  const visibleModules = MODULES.filter((mod) => {
    // Disabled placeholders (Proveedores, Pedidos) always show
    if (mod.target === null) return true;
    // Modules without permission requirement always show (Inventario)
    if (!mod.permission) return true;
    // Check if user has the required permission
    return currentUser !== null && hasPermission(mod.permission);
  });

  return (
    <div className="flex flex-col gap-6 h-full p-4 md:p-6 lg:p-8 overflow-y-auto">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-pos-text">Panel Principal</h1>
        <p className="text-sm text-pos-muted mt-1">
          Seleccioná un módulo para comenzar
        </p>
      </div>

      {/* Responsive card grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {visibleModules.map((mod) => (
          <ModuleCard key={mod.label} {...mod} />
        ))}
      </div>
    </div>
  );
}
