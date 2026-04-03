import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { normalizeImage } from '../services/normalization/imageNormalizer';
import { useAssessmentStore } from '../stores/assessmentStore';
import { useTheme } from '../context/ThemeContext';
import { Theme } from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Review'>;
  route: RouteProp<RootStackParamList, 'Review'>;
};

export default function ReviewScreen({ navigation, route }: Props) {
  const { photoUri, step } = route.params;
  const { setFrontNormalization, setBackNormalization } = useAssessmentStore();
  const [isNormalizing, setIsNormalizing] = useState(true);
  const [normResult, setNormResult] = useState<Awaited<ReturnType<typeof normalizeImage>> | null>(null);
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const isFront = step === 'front';

  useEffect(() => {
    normalizeImage(photoUri)
      .then((result) => {
        setNormResult(result);
        if (isFront) setFrontNormalization(result);
        else setBackNormalization(result);
      })
      .catch((err) => {
        console.error('normalizeImage error:', err);
        Alert.alert('Error', `Failed to process image: ${err?.message ?? err}`);
        navigation.goBack();
      })
      .finally(() => setIsNormalizing(false));
  }, []);

  const handleContinue = () => {
    if (!normResult) return;
    if (isFront) {
      navigation.navigate('Camera', { step: 'back' });
    } else {
      navigation.navigate('Analysis');
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backBtnText}>← Retake</Text>
        </TouchableOpacity>
        <Text style={s.title}>{isFront ? 'Front Photo' : 'Back Photo'}</Text>
        <View style={s.backBtn} />
      </View>

      <View style={s.stepIndicator}>
        <Text style={s.stepText}>Step {isFront ? '1' : '2'} of 2</Text>
      </View>

      <View style={s.imageContainer}>
        <Image source={{ uri: photoUri }} style={s.image} resizeMode="cover" />
      </View>

      <View style={s.statusCard}>
        {isNormalizing ? (
          <View style={s.processingRow}>
            <ActivityIndicator color={theme.accent} />
            <Text style={s.processingText}>Normalizing image...</Text>
          </View>
        ) : normResult ? (
          <>
            <Text style={s.statusTitle}>Image Analysis</Text>
            <QualityRow
              label="Resolution"
              value={`${normResult.width}×${normResult.height}`}
              ok
              theme={theme}
            />
            <QualityRow
              label="Quality Score"
              value={`${Math.round(normResult.qualityScore * 100)}%`}
              ok={normResult.qualityScore >= 0.6}
              theme={theme}
            />
            {normResult.qualityIssues.length > 0 && (
              <View style={s.issuesBox}>
                <Text style={s.issuesLabel}>Issues detected:</Text>
                {normResult.qualityIssues.map((issue, i) => (
                  <Text key={i} style={s.issueText}>• {issue}</Text>
                ))}
              </View>
            )}
          </>
        ) : null}
      </View>

      {!isNormalizing && (
        <View style={s.actions}>
          <TouchableOpacity style={s.retakeBtn} onPress={() => navigation.goBack()}>
            <Text style={s.retakeBtnText}>Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.continueBtn} onPress={handleContinue}>
            <Text style={s.continueBtnText}>
              {isFront ? 'Next: Back Photo →' : 'Analyze →'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

function QualityRow({ label, value, ok, theme }: { label: string; value: string; ok: boolean; theme: Theme }) {
  const color = ok ? theme.success : theme.warning;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
      <Text style={{ color: theme.textSecondary, fontSize: 14 }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Text style={{ color, fontSize: 14, fontWeight: '600' }}>{value}</Text>
        <Text style={{ color, fontSize: 13 }}>{ok ? '✓' : '!'}</Text>
      </View>
    </View>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backBtn: { width: 80 },
  backBtnText: { color: theme.accent, fontSize: 15, fontWeight: '600' },
  title: { color: theme.text, fontSize: 17, fontWeight: '700' },
  stepIndicator: { alignItems: 'center', marginBottom: 10 },
  stepText: { color: theme.accent, fontSize: 12, fontWeight: '600' },
  imageContainer: { marginHorizontal: 20, borderRadius: 16, overflow: 'hidden', height: 280 },
  image: { width: '100%', height: '100%' },
  statusCard: {
    margin: 20,
    backgroundColor: theme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 18,
  },
  processingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  processingText: { color: theme.textSecondary, fontSize: 15 },
  statusTitle: { color: theme.text, fontSize: 16, fontWeight: '700', marginBottom: 14 },
  issuesBox: {
    backgroundColor: theme.isDark ? '#2A1500' : '#FFF7ED',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: theme.warning + '40',
  },
  issuesLabel: { color: theme.warning, fontSize: 13, fontWeight: '600', marginBottom: 4 },
  issueText: { color: theme.warning, fontSize: 13, marginTop: 2, opacity: 0.85 },
  actions: { flexDirection: 'row', padding: 20, gap: 12, marginTop: 'auto' },
  retakeBtn: {
    flex: 1,
    backgroundColor: theme.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    paddingVertical: 16,
    alignItems: 'center',
  },
  retakeBtnText: { color: theme.textSecondary, fontWeight: '600', fontSize: 16 },
  continueBtn: {
    flex: 2,
    backgroundColor: theme.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  continueBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
});
