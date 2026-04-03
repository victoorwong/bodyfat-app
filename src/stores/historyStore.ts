import { create } from 'zustand';
import * as FileSystem from 'expo-file-system/legacy';
import { Assessment } from '../types';

const HISTORY_FILE = `${FileSystem.documentDirectory}assessments.json`;

interface HistoryState {
  assessments: Assessment[];
  isLoaded: boolean;
  loadHistory: () => Promise<void>;
  addAssessment: (assessment: Assessment) => Promise<void>;
  deleteAssessment: (id: string) => Promise<void>;
  clearHistory: () => Promise<void>;
}

function migrateAssessment(a: any): Assessment {
  if (a.result.bodyFat === undefined && a.result.bodyFatRange) {
    a.result.bodyFat = (a.result.bodyFatRange.low + a.result.bodyFatRange.high) / 2;
  }
  return a as Assessment;
}

async function readFromDisk(): Promise<Assessment[]> {
  const info = await FileSystem.getInfoAsync(HISTORY_FILE);
  if (!info.exists) return [];
  const raw = await FileSystem.readAsStringAsync(HISTORY_FILE);
  const parsed = JSON.parse(raw);
  return parsed.map(migrateAssessment);
}

async function writeToDisk(assessments: Assessment[]): Promise<void> {
  await FileSystem.writeAsStringAsync(HISTORY_FILE, JSON.stringify(assessments));
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  assessments: [],
  isLoaded: false,

  loadHistory: async () => {
    const assessments = await readFromDisk();
    set({ assessments, isLoaded: true });
  },

  addAssessment: async (assessment) => {
    const updated = [assessment, ...get().assessments];
    await writeToDisk(updated);
    set({ assessments: updated });
  },

  deleteAssessment: async (id) => {
    const updated = get().assessments.filter((a) => a.id !== id);
    await writeToDisk(updated);
    set({ assessments: updated });
  },

  clearHistory: async () => {
    await writeToDisk([]);
    set({ assessments: [] });
  },
}));
