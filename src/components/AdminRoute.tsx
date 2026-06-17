import { type ReactNode, useEffect } from "react";
import { useAuthStore } from "@/store/auth";
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
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const setPage = useAppStore((s) => s.setPage);

  useEffect(() => {
    if (!hasPermission("configuracion")) {
      setPage("dashboard");
    }
  }, [hasPermission, setPage]);

  if (!hasPermission("configuracion")) {
    return null;
  }

  return <>{children}</>;
}
