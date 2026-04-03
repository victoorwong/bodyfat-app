import { create } from 'zustand';
import { NormalizationResult, AnalysisResult } from '../types';

interface AssessmentState {
  frontPhotoUri: string | null;
  backPhotoUri: string | null;
  frontNormalization: NormalizationResult | null;
  backNormalization: NormalizationResult | null;
  result: AnalysisResult | null;
  isAnalyzing: boolean;
  error: string | null;
  setFrontPhoto: (uri: string) => void;
  setBackPhoto: (uri: string) => void;
  setFrontNormalization: (result: NormalizationResult) => void;
  setBackNormalization: (result: NormalizationResult) => void;
  setResult: (result: AnalysisResult) => void;
  setAnalyzing: (value: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useAssessmentStore = create<AssessmentState>((set) => ({
  frontPhotoUri: null,
  backPhotoUri: null,
  frontNormalization: null,
  backNormalization: null,
  result: null,
  isAnalyzing: false,
  error: null,

  setFrontPhoto: (uri) => set({ frontPhotoUri: uri, frontNormalization: null, result: null, error: null }),
  setBackPhoto: (uri) => set({ backPhotoUri: uri, backNormalization: null }),
  setFrontNormalization: (frontNormalization) => set({ frontNormalization }),
  setBackNormalization: (backNormalization) => set({ backNormalization }),
  setResult: (result) => set({ result }),
  setAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
  setError: (error) => set({ error }),
  reset: () => set({
    frontPhotoUri: null, backPhotoUri: null,
    frontNormalization: null, backNormalization: null,
    result: null, isAnalyzing: false, error: null,
  }),
}));
