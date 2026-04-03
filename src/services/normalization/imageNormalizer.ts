import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { NormalizationResult } from '../../types';

const TARGET_WIDTH = 512;
const TARGET_HEIGHT = 512;
const MIN_DIMENSION = 300;

export async function normalizeImage(uri: string): Promise<NormalizationResult> {
  const qualityIssues: string[] = [];

  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) {
    return { uri, width: 0, height: 0, qualityScore: 0, qualityIssues: ['Image not found'], passed: false };
  }

  const context = ImageManipulator.manipulate(uri);
  context.resize({ width: TARGET_WIDTH, height: TARGET_HEIGHT });
  const image = await context.renderAsync();
  const manipulated = await image.saveAsync({ compress: 0.9, format: SaveFormat.JPEG });

  if (manipulated.width < MIN_DIMENSION || manipulated.height < MIN_DIMENSION) {
    qualityIssues.push('Image resolution is too low');
  }

  const fileSizeKB = info.size ? info.size / 1024 : 0;
  if (fileSizeKB < 10) {
    qualityIssues.push('Image file size too small — may be low quality');
  }

  const qualityScore = qualityIssues.length === 0 ? 1 : Math.max(0.3, 1 - qualityIssues.length * 0.3);
  const passed = qualityIssues.length === 0;

  return {
    uri: manipulated.uri,
    width: manipulated.width,
    height: manipulated.height,
    qualityScore,
    qualityIssues,
    passed,
  };
}

export async function imageUriToBase64(uri: string): Promise<string> {
  return await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}
