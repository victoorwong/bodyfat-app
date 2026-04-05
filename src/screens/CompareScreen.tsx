import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  FlatList,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { RootStackParamList, Assessment, ComparisonAnalysis } from '../types';
import { useHistoryStore } from '../stores/historyStore';
import { useTheme } from '../context/ThemeContext';
import { Theme } from '../theme';
import { compareAssessments } from '../services/api/assessmentApi';

type Props = { navigation?: any };
type Slot = 'before' | 'after';
type AssessmentSlot = { type: 'assessment'; data: Assessment };
type GallerySlot = { type: 'gallery'; uri: string };
type SlotValue = AssessmentSlot | GallerySlot | null;

function getSlotUri(slot: SlotValue): string | null {
  if (!slot) return null;
  return slot.type === 'assessment' ? slot.data.normalizedUri : slot.uri;
}

function getSlotBf(slot: SlotValue): number | null {
  if (!slot || slot.type === 'gallery') return null;
  return slot.data.result.bodyFat ?? null;
}

async function toBase64(uri: string): Promise<string> {
  return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
}

export default function CompareScreen({ navigation: navProp }: Props) {
  const rootNav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const navigation = navProp ?? rootNav;
  const { assessments, loadHistory } = useHistoryStore();
  const [before, setBefore] = useState<SlotValue>(null);
  const [after, setAfter] = useState<SlotValue>(null);
  const [picking, setPicking] = useState<Slot | null>(null);
  const [analysis, setAnalysis] = useState<ComparisonAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  useEffect(() => { loadHistory(); }, []);

  // Reset analysis when slots change
  useEffect(() => { setAnalysis(null); }, [before, after]);

  const setSlot = (slot: Slot, value: SlotValue) => {
    if (slot === 'before') setBefore(value);
    else setAfter(value);
    setPicking(null);
  };

  const handlePickAssessment = (assessment: Assessment) => {
    setSlot(picking!, { type: 'assessment', data: assessment });
  };

  const handlePickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Gallery access is needed.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], quality: 0.9, allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setSlot(picking!, { type: 'gallery', uri: result.assets[0].uri });
    }
  };

  const handleAnalyze = async () => {
    if (!before || !after || before.type !== 'assessment' || after.type !== 'assessment') return;
    setAnalyzing(true);
    try {
      const beforeData = (before as AssessmentSlot).data;
      const afterData = (after as AssessmentSlot).data;

      const [bFront, aFront] = await Promise.all([
        toBase64(beforeData.normalizedUri),
        toBase64(afterData.normalizedUri),
      ]);
      const bBack = beforeData.backNormalizedUri ? await toBase64(beforeData.backNormalizedUri) : undefined;
      const aBack = afterData.backNormalizedUri ? await toBase64(afterData.backNormalizedUri) : undefined;

      const result = await compareAssessments(
        bFront, aFront,
        beforeData.result, afterData.result,
        beforeData.userProfile,
        bBack, aBack,
      );
      setAnalysis(result);
    } catch (err) {
      Alert.alert('Analysis Failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const beforeBf = getSlotBf(before);
  const afterBf = getSlotBf(after);
  const diff = beforeBf !== null && afterBf !== null ? afterBf - beforeBf : null;
  const lost = diff !== null && diff < 0;
  const gained = diff !== null && diff > 0;
  const resultColor = lost ? theme.success : gained ? theme.danger : theme.textSecondary;
  const resultLabel = lost ? 'Body Fat Lost' : gained ? 'Body Fat Gained' : 'No Change';
  const resultArrow = lost ? '↓' : gained ? '↑' : '→';

  const bothFilled = before !== null && after !== null;
  const bothAssessments = before?.type === 'assessment' && after?.type === 'assessment';
  const canAnalyze = bothAssessments && !analysis && !analyzing;

  return (
    <SafeAreaView style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={s.title}>Before & After</Text>
          <View style={{ width: 60 }} />
        </View>

        <View style={s.slotsRow}>
          <PhotoSlot label="BEFORE" slot={before} onPress={() => setPicking('before')} theme={theme} />
          <View style={s.vsContainer}>
            <Text style={s.vsText}>VS</Text>
          </View>
          <PhotoSlot label="AFTER" slot={after} onPress={() => setPicking('after')} theme={theme} />
        </View>

        {/* Quick diff */}
        {diff !== null && (
          <View style={[s.resultCard, { borderColor: resultColor + '50' }]}>
            <Text style={[s.resultArrow, { color: resultColor }]}>{resultArrow}</Text>
            <View style={s.resultText}>
              <Text style={[s.resultDiff, { color: resultColor }]}>{Math.abs(diff).toFixed(2)}%</Text>
              <Text style={[s.resultLabel, { color: resultColor }]}>{resultLabel}</Text>
            </View>
            <View style={s.resultDetails}>
              <Text style={s.detailText}>{beforeBf!.toFixed(2)}% → {afterBf!.toFixed(2)}%</Text>
              <Text style={s.detailSub}>
                {(before as AssessmentSlot).data.result.category} → {(after as AssessmentSlot).data.result.category}
              </Text>
            </View>
          </View>
        )}

        {bothFilled && !bothAssessments && (
          <View style={s.visualOnlyCard}>
            <Text style={s.visualOnlyText}>Visual comparison only — AI analysis requires two assessments.</Text>
          </View>
        )}

        {/* Analyze button */}
        {canAnalyze && (
          <TouchableOpacity style={s.analyzeBtn} onPress={handleAnalyze}>
            <Text style={s.analyzeBtnText}>Analyze Changes</Text>
          </TouchableOpacity>
        )}

        {analyzing && (
          <View style={s.loadingCard}>
            <ActivityIndicator color={theme.accent} />
            <Text style={s.loadingText}>Analyzing body composition changes...</Text>
          </View>
        )}

        {/* Analysis results */}
        {analysis && (
          <>
            {/* Summary */}
            <View style={s.card}>
              <Text style={s.cardTitle}>Summary</Text>
              <Text style={s.summaryText}>{analysis.summary}</Text>
            </View>

            {/* Metrics */}
            <View style={s.card}>
              <Text style={s.cardTitle}>Body Composition Metrics</Text>
              {analysis.metrics.map((metric, i) => (
                <View key={i}>
                  {i > 0 && <View style={s.metricDivider} />}
                  <View style={s.metricRow}>
                    <View style={s.metricLeft}>
                      <Text style={s.metricLabel}>{metric.label}</Text>
                      <Text style={s.metricChange}>
                        {metric.before} → {metric.after}
                      </Text>
                    </View>
                    <View style={[s.changeBadge, { backgroundColor: metric.improved ? theme.success + '22' : theme.danger + '22' }]}>
                      <Text style={[s.changeBadgeText, { color: metric.improved ? theme.success : theme.danger }]}>
                        {metric.change}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            {/* Observations */}
            <View style={s.card}>
              <Text style={s.cardTitle}>Visual Observations</Text>
              {analysis.observations.map((obs, i) => (
                <View key={i} style={s.obsRow}>
                  <View style={[s.obsDot, { backgroundColor: theme.accent }]} />
                  <Text style={s.obsText}>{obs}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity style={s.reanalyzeBtn} onPress={() => { setAnalysis(null); }}>
              <Text style={s.reanalyzeBtnText}>Re-analyze</Text>
            </TouchableOpacity>
          </>
        )}

        {!bothFilled && (
          <Text style={s.hint}>Tap a slot to select from your assessments or gallery</Text>
        )}
      </ScrollView>

      {/* Picker modal */}
      <Modal visible={picking !== null} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Select {picking === 'before' ? 'Before' : 'After'} Photo</Text>
              <TouchableOpacity onPress={() => setPicking(null)}>
                <Text style={s.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={s.galleryOption} onPress={handlePickFromGallery}>
              <View style={s.galleryOptionText}>
                <Text style={s.galleryOptionTitle}>Choose from Gallery</Text>
                <Text style={s.galleryOptionSub}>Pick any photo from your device</Text>
              </View>
              <Text style={s.galleryOptionArrow}>›</Text>
            </TouchableOpacity>

            <View style={s.dividerRow}>
              <View style={s.dividerLine} />
              <Text style={s.dividerLabel}>or from assessments</Text>
              <View style={s.dividerLine} />
            </View>

            {assessments.length === 0 ? (
              <Text style={s.noAssessments}>No assessments yet.</Text>
            ) : (
              <FlatList
                data={assessments}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                  const active = picking === 'before'
                    ? before?.type === 'assessment' && (before as AssessmentSlot).data.id === item.id
                    : after?.type === 'assessment' && (after as AssessmentSlot).data.id === item.id;
                  return (
                    <TouchableOpacity
                      style={[s.pickItem, active && s.pickItemActive]}
                      onPress={() => handlePickAssessment(item)}
                    >
                      <Image source={{ uri: item.normalizedUri }} style={s.pickThumb} />
                      <View style={s.pickInfo}>
                        <Text style={s.pickBf}>{item.result.bodyFat?.toFixed(2) ?? '—'}%</Text>
                        <Text style={s.pickCategory}>{item.result.category}</Text>
                        <Text style={s.pickDate}>
                          {new Date(item.createdAt).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric',
                          })}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                }}
                contentContainerStyle={s.pickList}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function PhotoSlot({ label, slot, onPress, theme }: {
  label: string; slot: SlotValue; onPress: () => void; theme: Theme;
}) {
  const uri = getSlotUri(slot);
  const bf = getSlotBf(slot);
  return (
    <TouchableOpacity
      style={{ flex: 1, backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.border, padding: 14, alignItems: 'center', minHeight: 220 }}
      onPress={onPress} activeOpacity={0.8}
    >
      <Text style={{ color: theme.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 10 }}>{label}</Text>
      {uri ? (
        <>
          <Image source={{ uri }} style={{ width: '100%', aspectRatio: 0.75, borderRadius: 10, marginBottom: 10 }} />
          {bf !== null
            ? <Text style={{ color: theme.text, fontSize: 20, fontWeight: '800' }}>{bf.toFixed(2)}%</Text>
            : <Text style={{ color: theme.textMuted, fontSize: 13 }}>Gallery photo</Text>
          }
          {slot?.type === 'assessment' && (
            <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 2 }}>
              {new Date((slot as AssessmentSlot).data.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Text>
          )}
        </>
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Text style={{ color: theme.border, fontSize: 36, fontWeight: '300' }}>+</Text>
          <Text style={{ color: theme.textMuted, fontSize: 13 }}>Tap to select</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  scroll: { paddingBottom: 48 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  backText: { color: theme.accent, fontSize: 15, fontWeight: '600', width: 60 },
  title: { color: theme.text, fontSize: 17, fontWeight: '700' },
  slotsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginTop: 8 },
  vsContainer: { width: 40, alignItems: 'center' },
  vsText: { color: theme.textMuted, fontSize: 13, fontWeight: '700' },
  resultCard: { marginHorizontal: 20, marginTop: 16, backgroundColor: theme.surface, borderRadius: 20, borderWidth: 1.5, padding: 24, alignItems: 'center', gap: 8 },
  resultArrow: { fontSize: 44, fontWeight: '800', lineHeight: 52 },
  resultText: { alignItems: 'center' },
  resultDiff: { fontSize: 34, fontWeight: '800' },
  resultLabel: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  resultDetails: { alignItems: 'center', marginTop: 6 },
  detailText: { color: theme.textSecondary, fontSize: 14 },
  detailSub: { color: theme.textMuted, fontSize: 12, marginTop: 3 },
  visualOnlyCard: { marginHorizontal: 20, marginTop: 16, backgroundColor: theme.surface2, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: theme.border },
  visualOnlyText: { color: theme.textSecondary, fontSize: 13, textAlign: 'center' },
  analyzeBtn: { marginHorizontal: 20, marginTop: 16, backgroundColor: theme.accent, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  analyzeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  loadingCard: { marginHorizontal: 20, marginTop: 16, backgroundColor: theme.surface, borderRadius: 14, borderWidth: 1, borderColor: theme.border, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 14 },
  loadingText: { color: theme.textSecondary, fontSize: 14 },
  card: { marginHorizontal: 20, marginTop: 16, backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.border, padding: 20 },
  cardTitle: { color: theme.text, fontSize: 15, fontWeight: '700', marginBottom: 14 },
  summaryText: { color: theme.textSecondary, fontSize: 14, lineHeight: 22 },
  metricRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  metricLeft: { flex: 1 },
  metricLabel: { color: theme.text, fontSize: 14, fontWeight: '600' },
  metricChange: { color: theme.textSecondary, fontSize: 12, marginTop: 3 },
  metricDivider: { height: 1, backgroundColor: theme.border },
  changeBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  changeBadgeText: { fontSize: 13, fontWeight: '700' },
  obsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  obsDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6, flexShrink: 0 },
  obsText: { color: theme.textSecondary, fontSize: 14, flex: 1, lineHeight: 20 },
  reanalyzeBtn: { marginHorizontal: 20, marginTop: 12, paddingVertical: 12, alignItems: 'center' },
  reanalyzeBtnText: { color: theme.textMuted, fontSize: 14 },
  hint: { color: theme.textMuted, fontSize: 14, textAlign: 'center', marginTop: 24, paddingHorizontal: 32 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: theme.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1, borderColor: theme.border, paddingTop: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16 },
  modalTitle: { color: theme.text, fontSize: 17, fontWeight: '700' },
  modalClose: { color: theme.textSecondary, fontSize: 20 },
  galleryOption: { flexDirection: 'row', alignItems: 'center', gap: 14, marginHorizontal: 16, backgroundColor: theme.surface2, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: theme.border },
  galleryOptionText: { flex: 1 },
  galleryOptionTitle: { color: theme.text, fontSize: 15, fontWeight: '700' },
  galleryOptionSub: { color: theme.textSecondary, fontSize: 12, marginTop: 2 },
  galleryOptionArrow: { color: theme.textMuted, fontSize: 22 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginVertical: 16, gap: 8 },
  dividerLine: { flex: 1, height: 1, backgroundColor: theme.border },
  dividerLabel: { color: theme.textMuted, fontSize: 12, fontWeight: '600' },
  noAssessments: { color: theme.textMuted, textAlign: 'center', padding: 20 },
  pickList: { paddingHorizontal: 16, paddingBottom: 40 },
  pickItem: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: theme.surface2, borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1.5, borderColor: 'transparent' },
  pickItemActive: { borderColor: theme.accent },
  pickThumb: { width: 52, height: 65, borderRadius: 8 },
  pickInfo: { flex: 1 },
  pickBf: { color: theme.text, fontSize: 20, fontWeight: '800' },
  pickCategory: { color: theme.textSecondary, fontSize: 13, marginTop: 2 },
  pickDate: { color: theme.textMuted, fontSize: 12, marginTop: 2 },
});
