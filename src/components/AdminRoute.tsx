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
      setError("Enter a PIN");
      return;
    }
    if (pin !== confirmPin) {
      setError("PINs do not match");
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-8">
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

        <h2 className="text-xl font-bold text-center text-gray-800 mb-2">
          Admin Access
        </h2>
        <p className="text-sm text-center text-gray-500 mb-6">
          {step === "setup"
            ? "Set an admin PIN to enable admin features"
            : "Enter your PIN to unlock admin mode"}
        </p>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2 mb-4">
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
                placeholder="Enter PIN"
                autoFocus
                className="w-full text-center text-2xl tracking-[0.5em] border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-pos-secondary touch-target"
                maxLength={10}
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={!pin}
                className="flex-1 px-4 py-2.5 bg-pos-secondary text-white rounded-lg font-medium touch-target hover:opacity-90 disabled:opacity-50"
              >
                Unlock
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium touch-target hover:bg-gray-50"
              >
                Cancel
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
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                New PIN
              </label>
              <input
                id="admin-pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                value={pin}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="Enter new PIN"
                autoFocus
                className="w-full text-center text-2xl tracking-[0.5em] border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-pos-secondary touch-target"
                maxLength={10}
              />
            </div>

            <div>
              <label
                htmlFor="admin-pin-confirm"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Confirm PIN
              </label>
              <input
                id="admin-pin-confirm"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="Confirm PIN"
                className="w-full text-center text-2xl tracking-[0.5em] border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-pos-secondary touch-target"
                maxLength={10}
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={!pin || !confirmPin}
                className="flex-1 px-4 py-2.5 bg-pos-secondary text-white rounded-lg font-medium touch-target hover:opacity-90 disabled:opacity-50"
              >
                Set PIN & Unlock
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium touch-target hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
