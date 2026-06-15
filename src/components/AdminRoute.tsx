import { useState, type ReactNode } from "react";
import { useAdminStore } from "@/store/admin";
import { useAppStore } from "@/store";

// ──────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────

type AdminRouteProps = {
  children: ReactNode;
};

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export default function AdminRoute({ children }: AdminRouteProps) {
  const isUnlocked = useAdminStore((s) => s.isUnlocked);
  const unlock = useAdminStore((s) => s.unlock);
  const pinHash = useAdminStore((s) => s.pinHash);
  const setPin = useAdminStore((s) => s.setPin);
  const setPage = useAppStore((s) => s.setPage);

  const [pin, setPinInput] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"unlock" | "setup">(
    pinHash ? "unlock" : "setup",
  );

  // ── If unlocked, render children ──

  if (isUnlocked) {
    return <>{children}</>;
  }

  // ── PIN entry handlers ──

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const ok = await unlock(pin);
    if (ok) {
      setPinInput("");
    } else {
      setError("PIN incorrecto");
    }
  }

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!pin) {
      setError("Ingresá un PIN");
      return;
    }
    if (pin !== confirmPin) {
      setError("Los PINs no coinciden");
      return;
    }

    await setPin(pin);
    // After setting, auto-unlock
    await unlock(pin);
    setPinInput("");
    setConfirmPin("");
  }

  function handleDismiss() {
    setPage("pos");
  }

  // ── Render: PIN gate screen ──

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-pos-surface rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-8">
        {/* Lock icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-pos-secondary/10 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-pos-secondary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
        </div>

        <h2 className="text-xl font-bold text-center text-pos-text mb-2">
          Acceso Admin
        </h2>
        <p className="text-sm text-center text-pos-muted mb-6">
          {step === "setup"
            ? "Configurá un PIN de admin para acceder a la administración"
            : "Ingresá tu PIN para desbloquear el modo admin"}
        </p>

        {/* Error */}
        {error && (
          <div className="bg-pos-danger/10 border border-pos-danger/30 text-pos-danger text-sm rounded-lg px-4 py-2 mb-4">
            {error}
          </div>
        )}

        {/* Unlock form */}
        {step === "unlock" && (
          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                value={pin}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="Ingresá PIN"
                autoFocus
                className="w-full text-center text-2xl tracking-[0.5em] border border-pos-muted/30 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-pos-secondary touch-target bg-pos-surface text-pos-text"
                maxLength={10}
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={!pin}
                className="flex-1 px-4 py-2.5 bg-pos-secondary text-white rounded-lg font-medium touch-target hover:opacity-90 disabled:opacity-50"
              >
                Desbloquear
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="px-4 py-2.5 border border-pos-muted/30 text-pos-text rounded-lg font-medium touch-target hover:bg-pos-background"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        {/* Setup form (first time) */}
        {step === "setup" && (
          <form onSubmit={handleSetup} className="space-y-4">
            <div>
              <label
                htmlFor="admin-pin"
                className="block text-sm font-medium text-pos-text mb-1"
              >
                Nuevo PIN
              </label>
              <input
                id="admin-pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                value={pin}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="Ingresá nuevo PIN"
                autoFocus
                className="w-full text-center text-2xl tracking-[0.5em] border border-pos-muted/30 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-pos-secondary touch-target bg-pos-surface text-pos-text"
                maxLength={10}
              />
            </div>

            <div>
              <label
                htmlFor="admin-pin-confirm"
                className="block text-sm font-medium text-pos-text mb-1"
              >
                Confirmar PIN
              </label>
              <input
                id="admin-pin-confirm"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="Confirmar PIN"
                className="w-full text-center text-2xl tracking-[0.5em] border border-pos-muted/30 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-pos-secondary touch-target bg-pos-surface text-pos-text"
                maxLength={10}
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={!pin || !confirmPin}
                className="flex-1 px-4 py-2.5 bg-pos-secondary text-white rounded-lg font-medium touch-target hover:opacity-90 disabled:opacity-50"
              >
                Configurar PIN y Desbloquear
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="px-4 py-2.5 border border-pos-muted/30 text-pos-text rounded-lg font-medium touch-target hover:bg-pos-background"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
