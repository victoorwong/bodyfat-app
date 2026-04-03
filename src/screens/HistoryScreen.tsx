import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Assessment } from '../types';
import { useHistoryStore } from '../stores/historyStore';
import { useTheme } from '../context/ThemeContext';
import { Theme } from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'History' | 'Compare'>;
};

const CONFIDENCE_COLORS: Record<string, { bg: string; text: string }> = {
  high: { bg: 'rgba(74,222,128,0.15)', text: '#4ADE80' },
  medium: { bg: 'rgba(251,191,36,0.15)', text: '#FBBF24' },
  low: { bg: 'rgba(248,113,113,0.15)', text: '#F87171' },
};

export default function HistoryScreen({ navigation }: Props) {
  const { assessments, loadHistory, deleteAssessment } = useHistoryStore();
  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  useEffect(() => {
    loadHistory();
  }, []);

  const handleDelete = (id: string) => {
    swipeableRefs.current.get(id)?.close();
    deleteAssessment(id);
  };

  const renderRightActions = (id: string) => (
    <TouchableOpacity style={s.deleteAction} onPress={() => handleDelete(id)}>
      <Text style={s.deleteActionText}>Delete</Text>
    </TouchableOpacity>
  );

  const renderItem = ({ item }: { item: Assessment }) => {
    const date = new Date(item.createdAt);
    const conf = CONFIDENCE_COLORS[item.result.confidence] ?? CONFIDENCE_COLORS.medium;
    return (
      <Swipeable
        ref={(ref) => {
          if (ref) swipeableRefs.current.set(item.id, ref);
          else swipeableRefs.current.delete(item.id);
        }}
        renderRightActions={() => renderRightActions(item.id)}
        rightThreshold={60}
        overshootRight={false}
      >
        <TouchableOpacity
          style={s.item}
          onPress={() => navigation.navigate('Results', { assessmentId: item.id })}
          activeOpacity={0.7}
        >
          <Image source={{ uri: item.normalizedUri }} style={s.thumbnail} />
          <View style={s.itemContent}>
            <Text style={s.bfText}>{item.result.bodyFat?.toFixed(1) ?? '—'}%</Text>
            <Text style={s.categoryText}>{item.result.category}</Text>
            <Text style={s.dateText}>
              {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
          </View>
          <View style={s.itemRight}>
            <View style={[s.badge, { backgroundColor: conf.bg }]}>
              <Text style={[s.badgeText, { color: conf.text }]}>
                {item.result.confidence.charAt(0).toUpperCase() + item.result.confidence.slice(1)}
              </Text>
            </View>
            <Text style={s.arrow}>›</Text>
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.title}>History</Text>
        <View style={s.headerRight}>
          {assessments.length >= 2 && (
            <TouchableOpacity onPress={() => navigation.navigate('Compare')}>
              <Text style={s.compareText}>Compare</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {assessments.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>📊</Text>
          <Text style={s.emptyTitle}>No assessments yet</Text>
          <Text style={s.emptySubtitle}>Take your first photo to get started.</Text>
          <TouchableOpacity style={s.startBtn} onPress={() => navigation.navigate('Camera', { step: 'front' })}>
            <Text style={s.startBtnText}>Take a Photo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {assessments.length >= 2 && <TrendSummary assessments={assessments} theme={theme} />}
          <Text style={s.hintText}>Tap to view · Swipe left to delete</Text>
          <FlatList
            data={assessments}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={s.list}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}
    </SafeAreaView>
  );
}

function TrendSummary({ assessments, theme }: { assessments: Assessment[]; theme: Theme }) {
  const diff = assessments[0].result.bodyFat - assessments[1].result.bodyFat;
  const improved = diff < 0;
  const arrow = diff < 0 ? '↓' : diff > 0 ? '↑' : '→';
  const color = diff < 0 ? '#4ADE80' : diff > 0 ? '#F87171' : theme.textSecondary;

  return (
    <View style={{
      marginHorizontal: 20,
      marginBottom: 8,
      backgroundColor: theme.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 16,
    }}>
      <Text style={{ color: theme.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 6 }}>
        TREND (last 2 assessments)
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color }}>{arrow}</Text>
        <Text style={{ fontSize: 16, fontWeight: '600', color }}>
          {Math.abs(diff).toFixed(1)}% {improved ? 'decrease' : diff > 0 ? 'increase' : 'no change'}
        </Text>
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
  backText: { color: theme.accent, fontSize: 15, fontWeight: '600', width: 60 },
  title: { color: theme.text, fontSize: 17, fontWeight: '700' },
  headerRight: { flexDirection: 'row', gap: 12, alignItems: 'center', justifyContent: 'flex-end', width: 60 },
  compareText: { color: theme.accent, fontSize: 14, fontWeight: '600' },
  hintText: { color: theme.textMuted, fontSize: 12, textAlign: 'center', marginBottom: 10 },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  item: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 10,
  },
  deleteAction: {
    backgroundColor: '#F87171',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 16,
    marginBottom: 10,
    marginLeft: 8,
  },
  deleteActionText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  thumbnail: { width: 56, height: 70, borderRadius: 10 },
  itemContent: { flex: 1 },
  bfText: { color: theme.text, fontSize: 24, fontWeight: '800' },
  categoryText: { color: theme.textSecondary, fontSize: 13, marginTop: 2 },
  dateText: { color: theme.textMuted, fontSize: 12, marginTop: 4 },
  itemRight: { alignItems: 'flex-end', gap: 10 },
  badge: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  arrow: { color: theme.textMuted, fontSize: 22 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { color: theme.text, fontSize: 20, fontWeight: '700' },
  emptySubtitle: { color: theme.textSecondary, fontSize: 15, textAlign: 'center' },
  startBtn: {
    backgroundColor: theme.accent,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
    marginTop: 8,
  },
  startBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
});
