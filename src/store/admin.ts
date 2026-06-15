import { create } from "zustand";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type BulkPriceOpts = {
  filter: "all" | "category" | "brand";
  filterId?: number;
  percent: number;
  target: "cost" | "selling" | "both";
  storeId: string;
};

export type BulkPreviewItem = {
  productId: number;
  name: string;
  currentPrice: number;
  newPrice: number;
};

// ──────────────────────────────────────────────
// SHA-256 hash via Web Crypto API
// ──────────────────────────────────────────────

export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ──────────────────────────────────────────────
// localStorage helpers
// ──────────────────────────────────────────────

const PIN_HASH_KEY = "admin_pin_hash";

function loadPinHash(): string | null {
  try {
    return localStorage.getItem(PIN_HASH_KEY);
  } catch {
    return null;
  }
}

function savePinHash(hash: string): void {
  try {
    localStorage.setItem(PIN_HASH_KEY, hash);
  } catch {
    // localStorage unavailable — skip
  }
}

// ──────────────────────────────────────────────
// Store shape
// ──────────────────────────────────────────────

export type AdminStore = {
  /** Whether admin mode is currently active (in-memory, resets on reload). */
  isUnlocked: boolean;

  /** The stored SHA-256 hex hash of the admin PIN, or null if not set. */
  pinHash: string | null;

  /** Current theme preference. */
  theme: "light" | "dark";

  // ── PIN actions ──

  /** Hash and store a new PIN. Overwrites any existing PIN. */
  setPin: (pin: string) => Promise<void>;

  /** Unlock admin mode by providing the correct PIN. Returns true if correct. */
  unlock: (pin: string) => Promise<boolean>;

  /** Lock admin mode (no PIN required — just clears the in-memory flag). */
  lock: () => void;

  /** Change PIN: verify old PIN first, then set new one. Returns true on success. */
  changePin: (oldPin: string, newPin: string) => Promise<boolean>;

  // ── Theme ──

  toggleTheme: () => void;

  // ── Bulk price (stubs — full logic in PR 3) ──

  preview: BulkPreviewItem[] | null;
  bulkPricePreview: (opts: BulkPriceOpts) => BulkPreviewItem[];
  bulkPriceConfirm: () => void;
};

// ──────────────────────────────────────────────
// Store implementation
// ──────────────────────────────────────────────

export const useAdminStore = create<AdminStore>((set, get) => ({
  // ── Defaults ──
  isUnlocked: false,
  pinHash: loadPinHash(),
  theme: "light",
  preview: null,

  // ── PIN actions ──

  setPin: async (pin: string) => {
    const hash = await hashPin(pin);
    savePinHash(hash);
    set({ pinHash: hash });
  },

  unlock: async (pin: string): Promise<boolean> => {
    const { pinHash } = get();
    if (!pinHash) return false;

    const hash = await hashPin(pin);
    if (hash === pinHash) {
      set({ isUnlocked: true });
      return true;
    }
    return false;
  },

  lock: () => {
    set({ isUnlocked: false });
  },

  changePin: async (oldPin: string, newPin: string): Promise<boolean> => {
    const { pinHash } = get();
    const oldHash = await hashPin(oldPin);

    if (pinHash && oldHash !== pinHash) {
      return false; // old PIN doesn't match
    }

    const newHash = await hashPin(newPin);
    savePinHash(newHash);
    set({ pinHash: newHash });
    return true;
  },

  // ── Theme ──

  toggleTheme: () => {
    set((s) => ({ theme: s.theme === "light" ? "dark" : "light" }));
  },

  // ── Bulk price stubs (PR 3) ──

  bulkPricePreview: (_opts: BulkPriceOpts): BulkPreviewItem[] => {
    // Stub — full implementation in PR 3
    return [];
  },

  bulkPriceConfirm: () => {
    // Stub — full implementation in PR 3
  },
}));
