import { create } from "zustand";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type Permission = "ventas" | "clientes" | "estadisticas" | "configuracion";

export type AuthUser = {
  id: string;
  name: string;
  passwordHash: string;
  permissions: Permission[];
  active: boolean;
  createdAt: string;
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
    permissions: Permission[];
    active: boolean;
  }) => Promise<void>;
  updateUser: (
    id: string,
    data: {
      name?: string;
      password?: string;
      permissions?: Permission[];
      active?: boolean;
    },
  ) => Promise<void>;
  deleteUser: (id: string) => void;

  hasPermission: (permission: Permission) => boolean;
};

// ──────────────────────────────────────────────
// Storage keys
// ──────────────────────────────────────────────

const USERS_KEY = "auth_users";
const CURRENT_USER_ID_KEY = "auth_current_user_id";

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

function loadUsers(): AuthUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (raw) return JSON.parse(raw) as AuthUser[];
  } catch {
    // localStorage unavailable
  }
  return [];
}

function saveUsers(users: AuthUser[]): void {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch {
    // localStorage unavailable — skip
  }
}

function loadCurrentUserId(): string | null {
  try {
    return localStorage.getItem(CURRENT_USER_ID_KEY);
  } catch {
    return null;
  }
}

function saveCurrentUserId(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem(CURRENT_USER_ID_KEY, id);
    } else {
      localStorage.removeItem(CURRENT_USER_ID_KEY);
    }
  } catch {
    // localStorage unavailable — skip
  }
}

// ──────────────────────────────────────────────
// Default admin permissions
// ──────────────────────────────────────────────

const ALL_PERMISSIONS: Permission[] = [
  "ventas",
  "clientes",
  "estadisticas",
  "configuracion",
];

// ──────────────────────────────────────────────
// Store
// ──────────────────────────────────────────────

export const useAuthStore = create<AuthStore>((set, get) => ({
  // ── Defaults ──
  users: [],
  currentUser: null,
  _hydrated: false,

  // ── Init (load from localStorage, first-run bootstrap) ──

  init: async () => {
    if (get()._hydrated) return;

    const users = loadUsers();

    // First-run bootstrap: create default admin user
    if (users.length === 0) {
      const adminHash = await hashPassword("admin");
      const adminUser: AuthUser = {
        id: crypto.randomUUID(),
        name: "admin",
        passwordHash: adminHash,
        permissions: [...ALL_PERMISSIONS],
        active: true,
        createdAt: new Date().toISOString(),
      };

      set({ users: [adminUser], _hydrated: true });
      saveUsers([adminUser]);
      return;
    }

    // Restore session
    const currentUserId = loadCurrentUserId();
    let currentUser: AuthUser | null = null;
    if (currentUserId) {
      const found = users.find((u) => u.id === currentUserId && u.active);
      if (found) currentUser = found;
    }

    set({ users, currentUser, _hydrated: true });
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
    saveCurrentUserId(user.id);
    return { success: true };
  },

  // ── Logout ──

  logout: () => {
    set({ currentUser: null });
    saveCurrentUserId(null);
  },

  // ── Add User ──

  addUser: async (data) => {
    const { users } = get();

    if (users.some((u) => u.name.toLowerCase() === data.name.toLowerCase())) {
      throw new Error("El nombre de usuario ya existe");
    }

    const newUser: AuthUser = {
      id: crypto.randomUUID(),
      name: data.name,
      passwordHash: await hashPassword(data.password),
      permissions: data.permissions,
      active: data.active,
      createdAt: new Date().toISOString(),
    };

    const updated = [...users, newUser];
    set({ users: updated });
    saveUsers(updated);
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
    const updated: AuthUser = {
      ...user,
      name: data.name ?? user.name,
      permissions: data.permissions ?? user.permissions,
      active: data.active ?? user.active,
      passwordHash: data.password
        ? await hashPassword(data.password)
        : user.passwordHash,
    };

    const updatedUsers = [...users];
    updatedUsers[index] = updated;
    set({ users: updatedUsers });
    saveUsers(updatedUsers);

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
    // Cannot delete the default admin user (name === "admin")
    if (user && user.name === "admin") return;

    const updated = users.filter((u) => u.id !== id);
    set({ users: updated });
    saveUsers(updated);

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
    return currentUser.permissions.includes(permission);
  },
}));
