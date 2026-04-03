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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Assessment } from '../types';
import { useHistoryStore } from '../stores/historyStore';
import { useTheme } from '../context/ThemeContext';
import { Theme } from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Compare'>;
};

type Slot = 'before' | 'after';

export default function CompareScreen({ navigation }: Props) {
  const { assessments, loadHistory } = useHistoryStore();
  const [before, setBefore] = useState<Assessment | null>(null);
  const [after, setAfter] = useState<Assessment | null>(null);
  const [picking, setPicking] = useState<Slot | null>(null);
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  useEffect(() => {
    loadHistory();
  }, []);

  const handlePick = (assessment: Assessment) => {
    if (picking === 'before') setBefore(assessment);
    else setAfter(assessment);
    setPicking(null);
  };

  const diff = before && after ? after.result.bodyFat - before.result.bodyFat : null;
  const gained = diff !== null && diff > 0;
  const lost = diff !== null && diff < 0;

  const resultColor = lost ? '#4ADE80' : gained ? '#F87171' : theme.textSecondary;
  const resultLabel = lost ? 'Body Fat Lost' : gained ? 'Body Fat Gained' : 'No Change';
  const resultArrow = lost ? '↓' : gained ? '↑' : '→';

  return (
    <SafeAreaView style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={s.title}>Before & After</Text>
          <View style={{ width: 60 }} />
        </View>

        {assessments.length < 2 ? (
          <View style={s.empty}>
            <Text style={s.emptyTitle}>Not enough data</Text>
            <Text style={s.emptySubtitle}>You need at least 2 assessments to compare.</Text>
            <TouchableOpacity style={s.cameraBtn} onPress={() => navigation.navigate('Camera', { step: 'front' })}>
              <Text style={s.cameraBtnText}>Take a Photo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Photo slots */}
            <View style={s.slotsRow}>
              <PhotoSlot
                label="BEFORE"
                assessment={before}
                onPress={() => setPicking('before')}
                theme={theme}
              />
              <View style={s.vsContainer}>
                <Text style={s.vsText}>VS</Text>
              </View>
              <PhotoSlot
                label="AFTER"
                assessment={after}
                onPress={() => setPicking('after')}
                theme={theme}
              />
            </View>

            {/* Result */}
            {diff !== null && (
              <View style={[s.resultCard, { borderColor: resultColor + '60' }]}>
                <Text style={[s.resultArrow, { color: resultColor }]}>{resultArrow}</Text>
                <View style={s.resultText}>
                  <Text style={[s.resultDiff, { color: resultColor }]}>
                    {Math.abs(diff).toFixed(2)}%
                  </Text>
                  <Text style={[s.resultLabel, { color: resultColor }]}>{resultLabel}</Text>
                </View>
                <View style={s.resultDetails}>
                  <Text style={s.detailText}>
                    {before!.result.bodyFat.toFixed(2)}% → {after!.result.bodyFat.toFixed(2)}%
                  </Text>
                  <Text style={s.detailSub}>
                    {before!.result.category} → {after!.result.category}
                  </Text>
                </View>
              </View>
            )}

            {diff === null && (
              <Text style={s.hint}>Tap a slot to select an assessment</Text>
            )}
          </>
        )}
      </ScrollView>

      {/* Picker modal */}
      <Modal visible={picking !== null} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>
                Select {picking === 'before' ? 'Before' : 'After'} Photo
              </Text>
              <TouchableOpacity onPress={() => setPicking(null)}>
                <Text style={s.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={assessments}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    s.pickItem,
                    (picking === 'before' ? before : after)?.id === item.id && s.pickItemActive,
                  ]}
                  onPress={() => handlePick(item)}
                >
                  <Image source={{ uri: item.normalizedUri }} style={s.pickThumb} />
                  <View style={s.pickInfo}>
                    <Text style={s.pickBf}>{item.result.bodyFat.toFixed(2)}%</Text>
                    <Text style={s.pickCategory}>{item.result.category}</Text>
                    <Text style={s.pickDate}>
                      {new Date(item.createdAt).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              contentContainerStyle={s.pickList}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function PhotoSlot({ label, assessment, onPress, theme }: {
  label: string;
  assessment: Assessment | null;
  onPress: () => void;
  theme: Theme;
}) {
  return (
    <TouchableOpacity
      style={{
        flex: 1,
        backgroundColor: theme.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.border,
        padding: 14,
        alignItems: 'center',
        minHeight: 220,
      }}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={{ color: theme.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 10 }}>
        {label}
      </Text>
      {assessment ? (
        <>
          <Image
            source={{ uri: assessment.normalizedUri }}
            style={{ width: '100%', aspectRatio: 0.75, borderRadius: 10, marginBottom: 10 }}
          />
          <Text style={{ color: theme.text, fontSize: 20, fontWeight: '800' }}>
            {assessment.result.bodyFat.toFixed(2)}%
          </Text>
          <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>
            {assessment.result.category}
          </Text>
          <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 2 }}>
            {new Date(assessment.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
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
  scroll: { paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backText: { color: theme.accent, fontSize: 15, fontWeight: '600', width: 60 },
  title: { color: theme.text, fontSize: 17, fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12, marginTop: 80 },
  emptyTitle: { color: theme.text, fontSize: 20, fontWeight: '700' },
  emptySubtitle: { color: theme.textSecondary, fontSize: 15, textAlign: 'center' },
  cameraBtn: {
    backgroundColor: theme.accent,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
    marginTop: 8,
  },
  cameraBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  slotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 8,
    gap: 0,
  },
  vsContainer: { width: 40, alignItems: 'center' },
  vsText: { color: theme.textMuted, fontSize: 13, fontWeight: '700' },
  resultCard: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: theme.surface,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  resultArrow: { fontSize: 48, fontWeight: '800', lineHeight: 56 },
  resultText: { alignItems: 'center' },
  resultDiff: { fontSize: 36, fontWeight: '800' },
  resultLabel: { fontSize: 15, fontWeight: '600', marginTop: 2 },
  resultDetails: { alignItems: 'center', marginTop: 8 },
  detailText: { color: theme.textSecondary, fontSize: 14 },
  detailSub: { color: theme.textMuted, fontSize: 12, marginTop: 4 },
  hint: { color: theme.textMuted, fontSize: 14, textAlign: 'center', marginTop: 24 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: theme.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: theme.border,
    paddingTop: 20,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  modalTitle: { color: theme.text, fontSize: 17, fontWeight: '700' },
  modalClose: { color: theme.textSecondary, fontSize: 20 },
  pickList: { paddingHorizontal: 16, paddingBottom: 40 },
  pickItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: theme.surface2,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  pickItemActive: { borderColor: theme.accent },
  pickThumb: { width: 52, height: 65, borderRadius: 8 },
  pickInfo: { flex: 1 },
  pickBf: { color: theme.text, fontSize: 20, fontWeight: '800' },
  pickCategory: { color: theme.textSecondary, fontSize: 13, marginTop: 2 },
  pickDate: { color: theme.textMuted, fontSize: 12, marginTop: 2 },
});
