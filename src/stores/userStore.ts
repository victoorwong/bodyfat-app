import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { UserProfile } from '../types';

const STORAGE_KEY = 'user_profile';

interface UserState {
  profile: UserProfile | null;
  isLoaded: boolean;
  setProfile: (profile: UserProfile) => Promise<void>;
  loadProfile: () => Promise<void>;
  clearProfile: () => Promise<void>;
}

export const useUserStore = create<UserState>((set) => ({
  profile: null,
  isLoaded: false,

  setProfile: async (profile) => {
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(profile));
    set({ profile });
  },

  loadProfile: async () => {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    set({ profile: raw ? JSON.parse(raw) : null, isLoaded: true });
  },

  clearProfile: async () => {
    await SecureStore.deleteItemAsync(STORAGE_KEY);
    set({ profile: null });
  },
}));
