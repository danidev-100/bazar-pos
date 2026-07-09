import { create } from "zustand";
import { execute, select } from "@/lib/db";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type Permission =
  | "ventas"
  | "caja"
  | "productos"
  | "clientes"
  | "proveedores"
  | "pedidos"
  | "facturacion"
  | "comprobantes"
  | "gastos"
  | "estadisticas"
  | "admin"
  | "usuarios";

export type Role = "admin" | "custom";

export type AuthUser = {
  id: number;
  name: string;
  passwordHash: string;
  role: Role;
  permissions: Permission[];
  active: boolean;
  createdAt: string;
};

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    "ventas",
    "caja",
    "productos",
    "clientes",
    "proveedores",
    "pedidos",
    "facturacion",
    "comprobantes",
    "gastos",
    "estadisticas",
    "admin",
    "usuarios",
  ],
  custom: [],
};

export type LoginResult = {
  success: boolean;
  error?: string;
};

export type AuthStore = {
  users: AuthUser[];
  currentUser: AuthUser | null;
  _hydrated: boolean;

  init: () => Promise<void>;
  login: (name: string, password: string) => Promise<LoginResult>;
  logout: () => void;

  addUser: (data: {
    name: string;
    password: string;
    role: Role;
    permissions?: Permission[];
    active: boolean;
  }) => Promise<void>;
  updateUser: (
    id: number,
    data: {
      name?: string;
      password?: string;
      role?: Role;
      permissions?: Permission[];
      active?: boolean;
    },
  ) => Promise<void>;
  deleteUser: (id: number) => void;

  hasPermission: (permission: Permission) => boolean;
};

// ──────────────────────────────────────────────
// LocalStorage migration key
// ──────────────────────────────────────────────

const USERS_KEY = "auth_users";

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

const OLD_TO_NEW: Record<string, Permission[]> = {
  configuracion: [
    "productos",
    "proveedores",
    "pedidos",
    "facturacion",
    "comprobantes",
    "gastos",
    "admin",
    "usuarios",
  ],
  ventas: ["ventas", "caja"],
  clientes: ["clientes"],
  estadisticas: ["estadisticas"],
};

function migratePermissions(oldPerms: string[]): Permission[] {
  if (oldPerms.includes("configuracion")) {
    const expanded = new Set<Permission>();
    for (const p of oldPerms) {
      const mapped = OLD_TO_NEW[p];
      if (mapped) mapped.forEach((np) => expanded.add(np));
    }
    return [...expanded];
  }
  return oldPerms.filter((p): p is Permission =>
    ALL_PERMISSIONS.includes(p as Permission),
  );
}

// ──────────────────────────────────────────────
// ID counter — follows pattern from customers/products
// ──────────────────────────────────────────────

let nextUserId = 1;

export function setNextUserId(id: number) {
  nextUserId = id;
}

// ──────────────────────────────────────────────
// Default admin permissions
// ──────────────────────────────────────────────

const ALL_PERMISSIONS: Permission[] = [
  "ventas", "caja", "productos", "clientes", "proveedores",
  "pedidos", "facturacion", "comprobantes", "gastos",
  "estadisticas", "admin", "usuarios",
];

// ──────────────────────────────────────────────
// localStorage migration
// ──────────────────────────────────────────────

function hasLocalStorageUsers(): boolean {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return !!raw;
  } catch {
    return false;
  }
}

function readLocalStorageUsers(): { name: string; passwordHash: string; role: Role; permissions: Permission[]; active: boolean; createdAt: string }[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    const users = JSON.parse(raw);
    return users.map((u: any) => {
      let role: Role = u.role || "custom";
      let perms = u.permissions ?? [];
      if (perms.includes("configuracion")) {
        perms = migratePermissions(perms);
      }
      return {
        name: u.name,
        passwordHash: u.passwordHash,
        role,
        permissions: perms,
        active: u.active ?? true,
        createdAt: u.createdAt ?? new Date().toISOString(),
      };
    });
  } catch {
    return [];
  }
}

function clearLocalStorageUsers(): void {
  try {
    localStorage.removeItem(USERS_KEY);
  } catch {
    // ignore
  }
}

// ──────────────────────────────────────────────
// Store
// ──────────────────────────────────────────────

export const useAuthStore = create<AuthStore>((set, get) => ({
  // ── Defaults ──
  users: [],
  currentUser: null,
  _hydrated: false,

  // ── Init (load from SQLite, migrate from localStorage) ──

  init: async () => {
    if (get()._hydrated) return;

    try {
      // 1. Try to load max ID from SQLite
      const rows = await select<any>("SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM users");
      if (rows.length > 0) {
        nextUserId = rows[0].next_id;
      }

      // 2. Check if SQLite has users
      const dbUsers = await select<any>("SELECT id, name, password_hash, role, permissions, active, created_at FROM users ORDER BY id");

      if (dbUsers.length > 0) {
        // SQLite has users — load them
        const users: AuthUser[] = dbUsers.map((r: any) => ({
          id: r.id,
          name: r.name,
          passwordHash: r.password_hash,
          role: r.role as Role,
          permissions: JSON.parse(r.permissions || "[]"),
          active: !!r.active,
          createdAt: r.created_at,
        }));
        set({ users, _hydrated: true });
        return;
      }
    } catch {
      // DB not available (test environment) — fall through to state-only mode
    }

    // 3. Check localStorage for migration
    if (hasLocalStorageUsers()) {
      const legacyUsers = readLocalStorageUsers();
      if (legacyUsers.length > 0) {
        const migrated: AuthUser[] = [];
        for (const lu of legacyUsers) {
          const id = nextUserId++;
          migrated.push({
            id,
            name: lu.name,
            passwordHash: lu.passwordHash,
            role: lu.role,
            permissions: lu.permissions,
            active: lu.active,
            createdAt: lu.createdAt,
          });

          // Try to persist to SQLite
          try {
            await execute(
              `INSERT INTO users (id, name, password_hash, role, permissions, active, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [id, lu.name, lu.passwordHash, lu.role, JSON.stringify(lu.permissions), lu.active ? 1 : 0, lu.createdAt, lu.createdAt],
            );
          } catch {
            // DB not available
          }
        }

        clearLocalStorageUsers();
        set({ users: migrated, _hydrated: true });
        return;
      }
    }

    // 4. First-run bootstrap: create default admin user
    try {
      const adminHash = await hashPassword("admin");
      const id = nextUserId++;
      const now = new Date().toISOString();
      const adminUser: AuthUser = {
        id,
        name: "admin",
        passwordHash: adminHash,
        role: "admin",
        permissions: [...ALL_PERMISSIONS],
        active: true,
        createdAt: now,
      };

      try {
        await execute(
          `INSERT INTO users (id, name, password_hash, role, permissions, active, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [id, "admin", adminHash, "admin", JSON.stringify(ALL_PERMISSIONS), 1, now, now],
        );
      } catch {
        // DB not available
      }

      set({ users: [adminUser], _hydrated: true });
      return;
    } catch {
      set({ users: [], _hydrated: true });
    }
  },

  // ── Login ──

  login: async (name: string, password: string): Promise<LoginResult> => {
    const { users } = get();
    const user = users.find(
      (u) => u.name.toLowerCase() === name.toLowerCase(),
    );

    if (!user) {
      return { success: false, error: "Credenciales inválidas" };
    }

    if (!user.active) {
      return { success: false, error: "Usuario desactivado" };
    }

    const inputHash = await hashPassword(password);
    if (inputHash !== user.passwordHash) {
      return { success: false, error: "Credenciales inválidas" };
    }

    set({ currentUser: user });
    return { success: true };
  },

  // ── Logout ──

  logout: () => {
    set({ currentUser: null });
  },

  // ── Add User ──

  addUser: async (data) => {
    const { users } = get();

    if (users.some((u) => u.name.toLowerCase() === data.name.toLowerCase())) {
      throw new Error("El nombre de usuario ya existe");
    }

    const id = nextUserId++;
    const now = new Date().toISOString();
    const passwordHash = await hashPassword(data.password);
    const permissions = data.permissions ?? ROLE_PERMISSIONS[data.role];

    const newUser: AuthUser = {
      id,
      name: data.name,
      passwordHash,
      role: data.role,
      permissions,
      active: data.active,
      createdAt: now,
    };

    const updated = [...users, newUser];
    set({ users: updated });

    try {
      await execute(
        `INSERT INTO users (id, name, password_hash, role, permissions, active, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [id, data.name, passwordHash, data.role, JSON.stringify(permissions), data.active ? 1 : 0, now, now],
      );
    } catch {
      // DB not available
    }
  },

  // ── Update User ──

  updateUser: async (id, data) => {
    const { users } = get();
    const index = users.findIndex((u) => u.id === id);
    if (index === -1) return;

    // Check duplicate name
    if (data.name) {
      const duplicate = users.find(
        (u) =>
          u.id !== id && u.name.toLowerCase() === data.name!.toLowerCase(),
      );
      if (duplicate) {
        throw new Error("El nombre de usuario ya existe");
      }
    }

    const user = users[index];
    const role = data.role ?? user.role;
    const permissions =
      data.permissions ??
      (data.role ? ROLE_PERMISSIONS[data.role] : user.permissions);

    const updated: AuthUser = {
      ...user,
      name: data.name ?? user.name,
      role,
      permissions,
      active: data.active ?? user.active,
      passwordHash: data.password
        ? await hashPassword(data.password)
        : user.passwordHash,
    };

    const updatedUsers = [...users];
    updatedUsers[index] = updated;
    set({ users: updatedUsers });

    const now = new Date().toISOString();

    try {
      const sets: string[] = [];
      const binds: any[] = [];

      if (data.name) { sets.push("name = $" + (binds.length + 1)); binds.push(data.name); }
      if (data.password) { sets.push("password_hash = $" + (binds.length + 1)); binds.push(updated.passwordHash); }
      if (data.role) { sets.push("role = $" + (binds.length + 1)); binds.push(data.role); }
      if (data.permissions) { sets.push("permissions = $" + (binds.length + 1)); binds.push(JSON.stringify(data.permissions)); }
      if (data.active !== undefined) { sets.push("active = $" + (binds.length + 1)); binds.push(data.active ? 1 : 0); }

      if (sets.length > 0) {
        sets.push("updated_at = $" + (binds.length + 1));
        binds.push(now);
        binds.push(id);
        await execute(
          `UPDATE users SET ${sets.join(", ")} WHERE id = $${binds.length}`,
          binds,
        );
      }
    } catch {
      // DB not available
    }

    // Update currentUser if it's the one being edited
    const { currentUser } = get();
    if (currentUser?.id === id) {
      set({ currentUser: updated });
    }
  },

  // ── Delete User ──

  deleteUser: (id) => {
    const { users } = get();
    const user = users.find((u) => u.id === id);
    // Cannot delete users with admin role
    if (user && user.role === "admin") return;

    const updated = users.filter((u) => u.id !== id);
    set({ users: updated });

    try {
      execute("DELETE FROM users WHERE id = $1", [id]).catch((err) => console.error("[db] auth.deleteUser failed:", err));
    } catch {
      // DB not available
    }

    // If the deleted user was currentUser, log out
    const { currentUser } = get();
    if (currentUser?.id === id) {
      get().logout();
    }
  },

  // ── Permission check ──

  hasPermission: (permission: Permission): boolean => {
    const { currentUser } = get();
    if (!currentUser) return false;
    if (currentUser.role === "admin") return true;
    return currentUser.permissions.includes(permission);
  },
}));
