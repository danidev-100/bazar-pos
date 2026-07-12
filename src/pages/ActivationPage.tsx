import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

interface ActivationResult {
  success: boolean;
  message: string;
}

export default function ActivationPage() {
  const [licenseKey, setLicenseKey] = useState("");
  const [machineCode, setMachineCode] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [checking, setChecking] = useState(true);

  // On mount, get the machine code (no internet needed)
  useEffect(() => {
    async function init() {
      try {
        const code = await invoke<string>("get_machine_code");
        setMachineCode(code);
      } catch (e) {
        console.error("Error getting machine code:", e);
      } finally {
        setChecking(false);
      }
    }
    init();
  }, []);

  const handleActivate = async () => {
    const key = licenseKey.trim();
    if (!key) return;

    setStatus("loading");
    setMessage("");

    try {
      const result = await invoke<ActivationResult>("activate_license", {
        licenseKey: key,
        machineCode,
      });

      if (result.success) {
        // Save activation locally using the same DB as the rest of the app
        const { saveActivation } = await import("@/lib/db");
        await saveActivation(key, machineCode, "PC");
      }

      setStatus(result.success ? "success" : "error");
      setMessage(result.message);

      if (result.success) {
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (e) {
      setStatus("error");
      setMessage(`Error: ${e}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleActivate();
  };

  if (checking) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-white dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-gray-500 dark:text-gray-400">Preparando activación...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl dark:bg-gray-800">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-2xl text-white shadow-lg">
            B
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">SISTEMA VENTA</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Punto de Venta
          </p>
        </div>

        {status === "success" ? (
          /* ── Success ── */
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <span className="text-2xl text-green-600 dark:text-green-400">✓</span>
            </div>
            <p className="text-sm text-green-700 dark:text-green-400">{message}</p>
            <p className="mt-2 text-xs text-gray-400">Reiniciando...</p>
          </div>
        ) : (
          <>
            {/* ── Machine code ── */}
            {machineCode && (
              <div className="mb-6 rounded-lg border border-dashed border-blue-200 bg-blue-50 p-4 text-center dark:border-blue-800 dark:bg-blue-900/20">
                <p className="mb-1 text-xs font-medium text-blue-600 dark:text-blue-400">
                  Código de máquina
                </p>
                <p className="select-all font-mono text-lg font-bold tracking-widest text-gray-900 dark:text-white">
                  {machineCode}
                </p>
                <p className="mt-2 text-xs text-blue-500 dark:text-blue-400">
                  Enviá este código a tu proveedor para recibir tu clave de activación
                </p>
              </div>
            )}

            {/* ── Activation form ── */}
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Clave de activación
                </label>
                <input
                  type="text"
                  value={licenseKey}
                  onChange={(e) => {
                    setLicenseKey(e.target.value.toUpperCase());
                    if (status !== "idle") setStatus("idle");
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="SISTEMA-VENTA-XXXX-XXXX-XXXX-XXXX"
                  disabled={status === "loading"}
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-center font-mono text-lg tracking-widest text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
                  autoFocus
                />
              </div>

              <button
                onClick={handleActivate}
                disabled={status === "loading" || !licenseKey.trim()}
                className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white shadow transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status === "loading" ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Validando...
                  </span>
                ) : (
                  "Activar licencia"
                )}
              </button>

              {message && status === "error" && (
                <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
                  {message}
                </div>
              )}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-400 dark:text-gray-500">
          <p>Sin conexión a internet requerida</p>
        </div>
      </div>
    </div>
  );
}
