import { AnalysisResult, UserProfile } from '../../types';

const SERVER_URL = 'http://192.168.1.73:3000';

export async function analyzeBodyComposition(
  frontBase64: string,
  backBase64: string,
  userProfile: UserProfile
): Promise<AnalysisResult> {
  const response = await fetch(`${SERVER_URL}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ frontBase64, backBase64, userProfile }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown server error' }));
    throw new Error(error.message ?? `Server error: ${response.status}`);
  }

  const data = await response.json();
  return data as AnalysisResult;
}
