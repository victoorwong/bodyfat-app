export type Sex = 'male' | 'female';
export type UnitSystem = 'metric' | 'imperial';

export interface UserProfile {
  height: number; // always stored in cm
  weight: number; // always stored in kg
  age: number;
  sex: Sex;
  unit?: UnitSystem;
}

export interface BodyMeasurements {
  waist?: number;  // stored in cm
  chest?: number;
  hips?: number;
  arms?: number;   // average of both arms
}

export interface Goal {
  targetBodyFat: number;
  deadline?: string; // ISO date string
}

export type BodyFatCategory =
  | 'Essential Fat'
  | 'Athletes'
  | 'Fitness'
  | 'Average'
  | 'Obese';

export type ConfidenceLevel = 'low' | 'medium' | 'high';

export interface AnalysisResult {
  bodyFat: number;
  category: BodyFatCategory;
  visualIndicators: string[];
  healthContext: string;
  confidence: ConfidenceLevel;
  recommendations: string[];
}

export interface ComparisonMetric {
  label: string;
  before: string;
  after: string;
  change: string;
  improved: boolean;
}

export interface ComparisonAnalysis {
  summary: string;
  metrics: ComparisonMetric[];
  observations: string[];
}

export interface NormalizationResult {
  uri: string;
  width: number;
  height: number;
  qualityScore: number; // 0-1
  qualityIssues: string[];
  passed: boolean;
}

export interface Assessment {
  id: string;
  createdAt: string; // ISO date string
  originalUri: string;
  normalizedUri: string;
  backNormalizedUri?: string;
  userProfile: UserProfile;
  result: AnalysisResult;
  note?: string;
  measurements?: BodyMeasurements;
}

export type RootStackParamList = {
  Main: undefined;
  Home: undefined;
  Camera: { step: 'front' | 'back' };
  Review: { photoUri: string; step: 'front' | 'back' };
  Analysis: undefined;
  Results: { assessmentId: string };
  History: undefined;
  Compare: undefined;
  Progress: undefined;
};
