import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { UserProfile, Goal, UnitSystem } from '../types';

const STORAGE_KEY = 'user_profile';
const GOAL_KEY = 'user_goal';
const UNIT_KEY = 'user_unit';

interface UserState {
  profile: UserProfile | null;
  goal: Goal | null;
  unit: UnitSystem;
  isLoaded: boolean;
  setProfile: (profile: UserProfile) => Promise<void>;
  loadProfile: () => Promise<void>;
  clearProfile: () => Promise<void>;
  setGoal: (goal: Goal | null) => Promise<void>;
  setUnit: (unit: UnitSystem) => Promise<void>;
}

export const useUserStore = create<UserState>((set) => ({
  profile: null,
  goal: null,
  unit: 'metric',
  isLoaded: false,

  setProfile: async (profile) => {
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(profile));
    set({ profile });
  },

  loadProfile: async () => {
    const [raw, goalRaw, unitRaw] = await Promise.all([
      SecureStore.getItemAsync(STORAGE_KEY),
      SecureStore.getItemAsync(GOAL_KEY),
      SecureStore.getItemAsync(UNIT_KEY),
    ]);
    set({
      profile: raw ? JSON.parse(raw) : null,
      goal: goalRaw ? JSON.parse(goalRaw) : null,
      unit: (unitRaw as UnitSystem) ?? 'metric',
      isLoaded: true,
    });
  },

  clearProfile: async () => {
    await SecureStore.deleteItemAsync(STORAGE_KEY);
    set({ profile: null });
  },

  setGoal: async (goal) => {
    if (goal) {
      await SecureStore.setItemAsync(GOAL_KEY, JSON.stringify(goal));
    } else {
      await SecureStore.deleteItemAsync(GOAL_KEY);
    }
    set({ goal });
  },

  setUnit: async (unit) => {
    await SecureStore.setItemAsync(UNIT_KEY, unit);
    set({ unit });
  },
}));
