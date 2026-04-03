import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, BodyFatCategory, ConfidenceLevel } from '../types';
import { useHistoryStore } from '../stores/historyStore';
import { useTheme } from '../context/ThemeContext';
import { Theme } from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Results'>;
  route: RouteProp<RootStackParamList, 'Results'>;
};

const CATEGORY_COLORS: Record<BodyFatCategory, string> = {
  'Essential Fat': '#FF6584',
  Athletes: '#4ADE80',
  Fitness: '#7C6FE0',
  Average: '#FBBF24',
  Obese: '#F87171',
};

const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence — retake for better results',
};

const CONFIDENCE_COLORS: Record<ConfidenceLevel, { bg: string; text: string }> = {
  high: { bg: 'rgba(74,222,128,0.15)', text: '#4ADE80' },
  medium: { bg: 'rgba(251,191,36,0.15)', text: '#FBBF24' },
  low: { bg: 'rgba(248,113,113,0.15)', text: '#F87171' },
};

export default function ResultsScreen({ navigation, route }: Props) {
  const { assessmentId } = route.params;
  const { assessments } = useHistoryStore();
  const { theme } = useTheme();
  const assessment = assessments.find((a) => a.id === assessmentId);

  const s = useMemo(() => makeStyles(theme), [theme]);

  if (!assessment) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.errorContainer}>
          <Text style={s.errorText}>Assessment not found.</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Home')}>
            <Text style={s.homeLink}>Go Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { result, normalizedUri, userProfile } = assessment;
  const categoryColor = CATEGORY_COLORS[result.category];
  const rawBf = result.bodyFat ?? ((result as any).bodyFatRange
    ? ((result as any).bodyFatRange.low + (result as any).bodyFatRange.high) / 2
    : 0);
  const bf = rawBf.toFixed(1);
  const confidenceStyle = CONFIDENCE_COLORS[result.confidence];

  const handleShare = async () => {
    await Share.share({
      message: `My body fat estimate: ${bf}% (${result.category}) via BodyComp AI`,
    });
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.navigate('Home')} style={s.doneBtn}>
            <Text style={s.doneBtnText}>✕ Done</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Your Results</Text>
          <TouchableOpacity onPress={handleShare}>
            <Text style={s.shareBtn}>Share</Text>
          </TouchableOpacity>
        </View>

        {/* Main result card */}
        <View style={[s.resultCard, { borderColor: categoryColor + '60' }]}>
          <Image source={{ uri: normalizedUri }} style={s.thumbnail} />
          <View style={s.resultMain}>
            <Text style={s.bfLabel}>BODY FAT</Text>
            <Text style={[s.bfValue, { color: categoryColor }]}>{bf}%</Text>
            <View style={[s.categoryBadge, { backgroundColor: categoryColor + '22', borderColor: categoryColor + '66' }]}>
              <Text style={[s.categoryText, { color: categoryColor }]}>{result.category}</Text>
            </View>
          </View>
        </View>

        {/* Confidence badge */}
        <View style={[s.confidenceCard, { backgroundColor: confidenceStyle.bg }]}>
          <View style={[s.confidenceDot, { backgroundColor: confidenceStyle.text }]} />
          <Text style={[s.confidenceText, { color: confidenceStyle.text }]}>
            {CONFIDENCE_LABELS[result.confidence]}
          </Text>
        </View>

        {/* Gauge bar */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Body Fat Scale</Text>
          <GaugeBar bf={rawBf} sex={userProfile.sex} theme={theme} />
        </View>

        {/* Visual indicators */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Visual Indicators Used</Text>
          {result.visualIndicators.map((indicator, i) => (
            <View key={i} style={s.indicator}>
              <View style={[s.indicatorDot, { backgroundColor: theme.accent }]} />
              <Text style={s.indicatorText}>{indicator}</Text>
            </View>
          ))}
        </View>

        {/* Health context */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Health Context</Text>
          <Text style={s.bodyText}>{result.healthContext}</Text>
        </View>

        {/* Recommendations */}
        {result.recommendations.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Recommendations</Text>
            {result.recommendations.map((rec, i) => (
              <View key={i} style={s.recRow}>
                <Text style={[s.recIcon, { color: theme.accent }]}>→</Text>
                <Text style={s.recText}>{rec}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Profile used */}
        <View style={s.profileNote}>
          <Text style={s.profileNoteText}>
            Calibrated with: {userProfile.height}cm · {userProfile.weight}kg · Age {userProfile.age} · {userProfile.sex === 'male' ? 'Male' : 'Female'}
          </Text>
        </View>

        {/* Disclaimer */}
        <Text style={s.disclaimer}>
          This is an AI-generated estimate for informational purposes only. Consult a healthcare professional for medical advice.
        </Text>

        {/* Actions */}
        <View style={s.actions}>
          <TouchableOpacity style={s.retakeBtn} onPress={() => navigation.navigate('Camera', { step: 'front' })}>
            <Text style={s.retakeBtnText}>Take Another</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.historyBtn} onPress={() => navigation.navigate('History')}>
            <Text style={s.historyBtnText}>View History</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function GaugeBar({ bf, sex, theme }: { bf: number; sex: string; theme: Theme }) {
  const ranges = sex === 'female'
    ? [
        { label: 'Essential', max: 13, color: '#FF6584' },
        { label: 'Athletes', max: 20, color: '#4ADE80' },
        { label: 'Fitness', max: 24, color: '#7C6FE0' },
        { label: 'Average', max: 31, color: '#FBBF24' },
        { label: 'Obese', max: 50, color: '#F87171' },
      ]
    : [
        { label: 'Essential', max: 5, color: '#FF6584' },
        { label: 'Athletes', max: 13, color: '#4ADE80' },
        { label: 'Fitness', max: 17, color: '#7C6FE0' },
        { label: 'Average', max: 24, color: '#FBBF24' },
        { label: 'Obese', max: 50, color: '#F87171' },
      ];

  const total = 50;
  const clampedBf = Math.min(Math.max(bf, 0), total);
  const markerPos = (clampedBf / total) * 100;

  return (
    <View style={gaugeStyles.container}>
      <View style={gaugeStyles.bar}>
        {ranges.map((range, i) => {
          const prev = i > 0 ? ranges[i - 1].max : 0;
          const width = ((range.max - prev) / total) * 100;
          return (
            <View
              key={range.label}
              style={[gaugeStyles.segment, { width: `${width}%`, backgroundColor: range.color }]}
            />
          );
        })}
        <View style={[gaugeStyles.marker, { left: `${markerPos}%` }]}>
          <View style={[gaugeStyles.markerLine, { backgroundColor: theme.text }]} />
          <Text style={[gaugeStyles.markerLabel, { color: theme.text }]}>{bf.toFixed(1)}%</Text>
        </View>
      </View>
      <View style={gaugeStyles.labels}>
        {ranges.map((r) => (
          <Text key={r.label} style={[gaugeStyles.rangeLabel, { color: r.color }]}>{r.label}</Text>
        ))}
      </View>
    </View>
  );
}

const gaugeStyles = StyleSheet.create({
  container: { marginTop: 4 },
  bar: { height: 14, flexDirection: 'row', borderRadius: 7, overflow: 'visible', position: 'relative' },
  segment: { height: '100%' },
  marker: { position: 'absolute', top: -5, alignItems: 'center', transform: [{ translateX: -1 }] },
  markerLine: { width: 3, height: 24, borderRadius: 2 },
  markerLabel: { fontSize: 11, fontWeight: '700', marginTop: 3 },
  labels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 22 },
  rangeLabel: { fontSize: 10, fontWeight: '600' },
});

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  scroll: { paddingBottom: 48 },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { color: theme.textSecondary, fontSize: 16 },
  homeLink: { color: theme.accent, fontSize: 16, fontWeight: '600' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  doneBtn: {},
  doneBtnText: { color: theme.textSecondary, fontSize: 15, fontWeight: '500' },
  headerTitle: { color: theme.text, fontSize: 17, fontWeight: '700' },
  shareBtn: { color: theme.accent, fontSize: 15, fontWeight: '600' },

  resultCard: {
    marginHorizontal: 20,
    backgroundColor: theme.surface,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    gap: 16,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  thumbnail: { width: 80, height: 100, borderRadius: 12 },
  resultMain: { flex: 1, justifyContent: 'center' },
  bfLabel: { color: theme.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  bfValue: { fontSize: 64, fontWeight: '800', lineHeight: 72, letterSpacing: -2 },
  categoryBadge: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    marginTop: 8,
  },
  categoryText: { fontSize: 13, fontWeight: '700' },

  confidenceCard: {
    marginHorizontal: 20,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  confidenceDot: { width: 8, height: 8, borderRadius: 4 },
  confidenceText: { fontSize: 13, fontWeight: '600' },

  card: {
    marginHorizontal: 20,
    backgroundColor: theme.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 20,
    marginBottom: 12,
  },
  cardTitle: { color: theme.text, fontSize: 15, fontWeight: '700', marginBottom: 16 },

  indicator: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  indicatorDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6, flexShrink: 0 },
  indicatorText: { color: theme.textSecondary, fontSize: 14, flex: 1, lineHeight: 20 },

  bodyText: { color: theme.textSecondary, fontSize: 14, lineHeight: 22 },

  recRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  recIcon: { fontWeight: '700', fontSize: 14 },
  recText: { color: theme.textSecondary, fontSize: 14, flex: 1, lineHeight: 20 },

  profileNote: { marginHorizontal: 20, marginBottom: 8 },
  profileNoteText: { color: theme.textMuted, fontSize: 12 },

  disclaimer: {
    color: theme.textMuted,
    fontSize: 11,
    marginHorizontal: 20,
    marginBottom: 20,
    lineHeight: 17,
  },

  actions: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 40 },
  retakeBtn: {
    flex: 1,
    backgroundColor: theme.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    paddingVertical: 15,
    alignItems: 'center',
  },
  retakeBtnText: { color: theme.textSecondary, fontWeight: '600', fontSize: 15 },
  historyBtn: {
    flex: 1,
    backgroundColor: theme.accent,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  historyBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
