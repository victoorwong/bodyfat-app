import { UnitSystem } from '../types';

export function kgToLbs(kg: number): number {
  return Math.round(kg * 2.2046 * 10) / 10;
}

export function lbsToKg(lbs: number): number {
  return Math.round((lbs / 2.2046) * 10) / 10;
}

export function cmToTotalInches(cm: number): number {
  return Math.round(cm / 2.54);
}

export function inchesToCm(inches: number): number {
  return Math.round(inches * 2.54);
}

export function cmToFtIn(cm: number): string {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return `${feet}'${inches}"`;
}

export function formatWeight(kg: number, unit: UnitSystem = 'metric'): string {
  if (unit === 'imperial') return `${kgToLbs(kg)} lbs`;
  return `${kg} kg`;
}

export function formatHeight(cm: number, unit: UnitSystem = 'metric'): string {
  if (unit === 'imperial') return cmToFtIn(cm);
  return `${cm} cm`;
}

export function formatMeasurement(cm: number, unit: UnitSystem = 'metric'): string {
  if (unit === 'imperial') return `${(cm / 2.54).toFixed(1)}"`;
  return `${cm} cm`;
}

export function measurementToCm(value: number, unit: UnitSystem = 'metric'): number {
  if (unit === 'imperial') return Math.round(value * 2.54 * 10) / 10;
  return value;
}
