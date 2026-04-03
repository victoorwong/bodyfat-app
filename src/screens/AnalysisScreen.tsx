import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Assessment } from '../types';
import { imageUriToBase64 } from '../services/normalization/imageNormalizer';
import { analyzeBodyComposition } from '../services/api/assessmentApi';
import { useAssessmentStore } from '../stores/assessmentStore';
import { useHistoryStore } from '../stores/historyStore';
import { useUserStore } from '../stores/userStore';
import { useTheme } from '../context/ThemeContext';
import { Theme } from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Analysis'>;
};

const STEPS = [
  'Normalizing image quality...',
  'Analyzing body composition markers...',
  'Applying AI model...',
  'Generating health context...',
];

export default function AnalysisScreen({ navigation }: Props) {
  const { frontPhotoUri, frontNormalization, backNormalization, setResult, setAnalyzing, setError } = useAssessmentStore();
  const { addAssessment } = useHistoryStore();
  const { profile } = useUserStore();
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const spinAnim = useRef(new Animated.Value(0)).current;
  const stepAnim = useRef(new Animated.Value(1)).current;
  const stepIndex = useRef(0);

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    const stepInterval = setInterval(() => {
      stepIndex.current = (stepIndex.current + 1) % STEPS.length;
      Animated.sequence([
        Animated.timing(stepAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(stepAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }, 2000);

    runAnalysis();

    return () => clearInterval(stepInterval);
  }, []);

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      if (!frontNormalization || !backNormalization) {
        throw new Error('Both front and back photos are required.');
      }

      const [frontBase64, backBase64] = await Promise.all([
        imageUriToBase64(frontNormalization.uri),
        imageUriToBase64(backNormalization.uri),
      ]);

      const userProfile = profile ?? { height: 175, weight: 75, age: 30, sex: 'male' as const };

      const result = await analyzeBodyComposition(frontBase64, backBase64, userProfile);
      setResult(result);

      const assessment: Assessment = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        createdAt: new Date().toISOString(),
        originalUri: frontPhotoUri ?? frontNormalization.uri,
        normalizedUri: frontNormalization.uri,
        backNormalizedUri: backNormalization.uri,
        userProfile,
        result,
      };

      await addAssessment(assessment);
      navigation.replace('Results', { assessmentId: assessment.id });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Analysis failed. Please try again.';
      setError(message);
      Alert.alert('Analysis Failed', message, [
        { text: 'OK', onPress: () => navigation.navigate('Home') },
      ]);
    } finally {
      setAnalyzing(false);
    }
  };

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <SafeAreaView style={s.container}>
      <View style={s.content}>
        <View style={s.spinnerContainer}>
          <Animated.View style={[s.spinnerRing, { transform: [{ rotate: spin }] }]} />
          <View style={s.spinnerCore}>
            <Text style={s.spinnerIcon}>🧠</Text>
          </View>
        </View>

        <Text style={s.title}>Analyzing...</Text>
        <Text style={s.subtitle}>This takes a few seconds</Text>

        <Animated.Text style={[s.stepText, { opacity: stepAnim }]}>
          {STEPS[stepIndex.current]}
        </Animated.Text>

        <View style={s.infoCard}>
          <Text style={s.infoTitle}>What's happening</Text>
          <InfoRow icon="🖼️" text="Processing front & back photos" theme={theme} />
          <InfoRow icon="📐" text="Identifying body composition markers" theme={theme} />
          <InfoRow icon="🤖" text="Running AI body fat estimation model" theme={theme} />
          <InfoRow icon="💡" text="Calibrating with your profile data" theme={theme} />
        </View>
      </View>
    </SafeAreaView>
  );
}

function InfoRow({ icon, text, theme }: { icon: string; text: string; theme: Theme }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Text style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{icon}</Text>
      <Text style={{ color: theme.textSecondary, fontSize: 14, flex: 1 }}>{text}</Text>
    </View>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  spinnerContainer: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  spinnerRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: theme.accent,
    borderTopColor: 'transparent',
  },
  spinnerCore: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: theme.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },
  spinnerIcon: { fontSize: 28 },
  title: { color: theme.text, fontSize: 26, fontWeight: '800', marginBottom: 8 },
  subtitle: { color: theme.textSecondary, fontSize: 15, marginBottom: 24 },
  stepText: {
    color: theme.accent,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 40,
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: theme.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 20,
    width: '100%',
    gap: 14,
  },
  infoTitle: { color: theme.text, fontSize: 15, fontWeight: '700', marginBottom: 4 },
});
