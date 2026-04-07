import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

const STORAGE_KEY = 'daily_checklist';
const TODAY_KEY = 'checklist_last_reset';

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

interface ChecklistState {
  items: ChecklistItem[];
  isLoaded: boolean;
  load: () => Promise<void>;
  toggle: (id: string) => Promise<void>;
  addItem: (text: string) => Promise<void>;
  editItem: (id: string, text: string) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
}

async function persist(items: ChecklistItem[]) {
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(items));
}

export const useChecklistStore = create<ChecklistState>((set, get) => ({
  items: [],
  isLoaded: false,

  load: async () => {
    const today = todayString();
    const lastReset = await SecureStore.getItemAsync(TODAY_KEY);
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);

    let items: ChecklistItem[] = raw ? JSON.parse(raw) as ChecklistItem[] : [];

    // Reset completions daily, preserve the items themselves
    if (lastReset !== today) {
      items = items.map((item) => ({ ...item, completed: false }));
      await SecureStore.setItemAsync(TODAY_KEY, today);
      await persist(items);
    }

    set({ items, isLoaded: true });
  },

  toggle: async (id) => {
    const items = get().items.map((item) =>
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    await persist(items);
    set({ items });
  },

  addItem: async (text) => {
    const newItem: ChecklistItem = {
      id: `item_${Date.now()}`,
      text: text.trim(),
      completed: false,
    };
    const items = [...get().items, newItem];
    await persist(items);
    set({ items });
  },

  editItem: async (id, text) => {
    const items = get().items.map((item) =>
      item.id === id ? { ...item, text: text.trim() } : item
    );
    await persist(items);
    set({ items });
  },

  deleteItem: async (id) => {
    const items = get().items.filter((item) => item.id !== id);
    await persist(items);
    set({ items });
  },
}));
