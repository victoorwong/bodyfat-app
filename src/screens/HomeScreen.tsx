import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useUserStore } from '../stores/userStore';
import { useHistoryStore } from '../stores/historyStore';
import { useChecklistStore } from '../stores/checklistStore';
import { useTheme } from '../context/ThemeContext';
import { Theme } from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

const BF_SCALE_MAX = 50;

function getBfProgressPercent(bf: number) {
  return Math.min(Math.max((bf / BF_SCALE_MAX) * 100, 0), 100);
}

function getBfSegments(sex: string) {
  if (sex === 'female') {
    return [
      { label: 'Essential', max: 13, color: '#FF6584' },
      { label: 'Athletes', max: 20, color: '#4ADE80' },
      { label: 'Fitness', max: 24, color: '#7C6FE0' },
      { label: 'Average', max: 31, color: '#FBBF24' },
      { label: 'Obese', max: 50, color: '#F87171' },
    ];
  }
  return [
    { label: 'Essential', max: 5, color: '#FF6584' },
    { label: 'Athletes', max: 13, color: '#4ADE80' },
    { label: 'Fitness', max: 17, color: '#7C6FE0' },
    { label: 'Average', max: 24, color: '#FBBF24' },
    { label: 'Obese', max: 50, color: '#F87171' },
  ];
}

function getTrendInsight(assessments: any[]): { text: string; color: string } | null {
  if (assessments.length < 2) return null;
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recent = assessments.filter((a) => new Date(a.createdAt).getTime() >= thirtyDaysAgo);
  const oldest30 = recent[recent.length - 1];
  const newest = assessments[0];
  if (!oldest30 || oldest30.id === newest.id) return null;
  const diff = newest.result.bodyFat - oldest30.result.bodyFat;
  if (Math.abs(diff) < 0.1) return null;
  if (diff < 0) return { text: `You've lost ${Math.abs(diff).toFixed(1)}% body fat in the last 30 days`, color: '#4ADE80' };
  return { text: `Body fat up ${diff.toFixed(1)}% over the last 30 days`, color: '#FBBF24' };
}

const TIPS = [
  { category: 'Nutrition', tip: 'Prioritize protein — aim for 0.7–1g per lb of bodyweight. It keeps you full and preserves muscle while cutting.' },
  { category: 'Nutrition', tip: 'Eat whole foods 80% of the time. Processed foods make it easy to overconsume calories without noticing.' },
  { category: 'Nutrition', tip: "Don't drink your calories. Liquid calories (juice, soda, alcohol) add up fast and don't satisfy hunger." },
  { category: 'Nutrition', tip: 'Track your food for at least 2 weeks. Most people underestimate calorie intake by 20–40%.' },
  { category: 'Nutrition', tip: 'Vegetables are your best friend. High in fiber, low in calories — they fill your plate without filling your fat stores.' },
  { category: 'Training', tip: 'Lift weights while cutting. Resistance training signals your body to hold on to muscle as you lose fat.' },
  { category: 'Training', tip: 'Cardio is a tool, not a punishment. LISS (low intensity steady state) like walking is sustainable and easy to recover from.' },
  { category: 'Training', tip: "Progressive overload matters. Try to beat last week's lifts — strength maintenance during a cut is a win." },
  { category: 'Training', tip: 'Daily steps are underrated. Getting 8–10k steps adds up to serious calorie burn without impacting recovery.' },
  { category: 'Recovery', tip: 'Sleep is the most powerful fat-loss tool most people ignore. Poor sleep increases hunger hormones and cravings.' },
  { category: 'Recovery', tip: 'Stress raises cortisol, which promotes fat storage — especially around the abdomen. Manage stress actively.' },
  { category: 'Recovery', tip: 'Deload weeks matter. A planned reduction in training volume every 4–6 weeks helps long-term progress.' },
  { category: 'Hydration', tip: 'Drink water before meals. Studies show it can reduce calorie intake at that meal by 13%.' },
  { category: 'Hydration', tip: 'Thirst is often mistaken for hunger. Before snacking, drink a glass of water and wait 10 minutes.' },
  { category: 'Mindset', tip: 'Fat loss is not linear. Weight can fluctuate ±2–3 lbs daily. Measure weekly averages, not daily.' },
  { category: 'Mindset', tip: "Consistency beats perfection. One bad day doesn't undo a week of progress. Keep going." },
  { category: 'Mindset', tip: 'Set process goals, not just outcome goals. "Work out 4x a week" is more actionable than "lose 10 lbs".' },
  { category: 'Mindset', tip: 'Take photos. The scale doesn\'t capture changes in body composition — photos do.' },
];

const CATEGORY_COLORS: Record<string, string> = {
  Nutrition: '#7C6FE0',
  Training: '#4ADE80',
  Recovery: '#FBBF24',
  Hydration: '#60A5FA',
  Mindset: '#F472B6',
};

function getTodaysTip() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return TIPS[dayOfYear % TIPS.length];
}

interface Recommendation {
  title: string;
  body: string;
  color: string;
  tag: string;
}

function getTrendRecommendations(assessments: any[]): Recommendation[] {
  if (assessments.length === 0) return [];

  const latest = assessments[0];
  const bf = latest.result.bodyFat as number;
  const category = latest.result.category as string;
  const recs: Recommendation[] = [];

  // Trend over last 30 days
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recent = assessments.filter((a) => new Date(a.createdAt).getTime() >= thirtyDaysAgo);
  const oldest30 = recent[recent.length - 1];
  const trendDiff = oldest30 && oldest30.id !== latest.id
    ? latest.result.bodyFat - oldest30.result.bodyFat
    : null;

  // Trend over last 7 days
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent7 = assessments.filter((a) => new Date(a.createdAt).getTime() >= sevenDaysAgo);
  const oldest7 = recent7[recent7.length - 1];
  const weekDiff = oldest7 && oldest7.id !== latest.id
    ? latest.result.bodyFat - oldest7.result.bodyFat
    : null;

  // ── Gaining fat ──────────────────────────────────────────────────────────────
  if (trendDiff !== null && trendDiff > 1.5) {
    recs.push({
      title: 'Reduce calorie surplus',
      body: `You've gained ${trendDiff.toFixed(1)}% body fat over the last 30 days. Consider trimming 200–300 kcal/day from your intake — usually easiest from refined carbs or added fats.`,
      color: '#F87171',
      tag: 'Nutrition',
    });
    recs.push({
      title: 'Add a cardio session',
      body: 'During a gaining phase with accelerated fat accumulation, adding one 30-min steady-state cardio session per week can help keep body fat in check without hurting recovery.',
      color: '#FBBF24',
      tag: 'Training',
    });
  }

  // ── Losing fat steadily ──────────────────────────────────────────────────────
  if (trendDiff !== null && trendDiff < -1) {
    recs.push({
      title: 'Great progress — protect muscle',
      body: `You've dropped ${Math.abs(trendDiff).toFixed(1)}% in 30 days. Make sure protein intake is high (0.8–1g/lb) and you're lifting heavy to preserve lean mass during your cut.`,
      color: '#4ADE80',
      tag: 'Training',
    });
  }

  // ── Fast loss this week (possible muscle loss risk) ──────────────────────────
  if (weekDiff !== null && weekDiff < -1.2) {
    recs.push({
      title: 'Losing too fast — slow down',
      body: `You've dropped ${Math.abs(weekDiff).toFixed(1)}% in just 7 days. Losses faster than ~1%/week increase risk of muscle loss. Consider adding 200–300 kcal back and prioritising sleep.`,
      color: '#FBBF24',
      tag: 'Recovery',
    });
  }

  // ── No change (stall) ────────────────────────────────────────────────────────
  if (trendDiff !== null && Math.abs(trendDiff) < 0.3 && assessments.length >= 3) {
    recs.push({
      title: 'Progress stalled — break the plateau',
      body: 'Body fat has barely shifted over the last 30 days. Try a 2-week diet break at maintenance, then resume your cut — this often resets hormones and restarts fat loss.',
      color: '#60A5FA',
      tag: 'Mindset',
    });
    recs.push({
      title: 'Audit your food tracking',
      body: 'Stalls are often caused by gradual calorie creep. Re-weigh portions for 3–5 days to check accuracy — even 100–200 extra kcal/day adds up.',
      color: '#7C6FE0',
      tag: 'Nutrition',
    });
  }

  // ── Category-based baseline recs ────────────────────────────────────────────
  if (category === 'Obese') {
    recs.push({
      title: 'Start with walking',
      body: `At ${bf.toFixed(1)}% body fat, the most sustainable first step is 7,000–10,000 steps per day. It's low impact, requires no equipment, and burns meaningful calories over time.`,
      color: '#F87171',
      tag: 'Training',
    });
    recs.push({
      title: 'Focus on protein first',
      body: 'Before counting every calorie, focus on making sure every meal has a quality protein source. This alone often reduces total intake naturally and preserves muscle.',
      color: '#F87171',
      tag: 'Nutrition',
    });
  }

  if (category === 'Average') {
    recs.push({
      title: 'You\'re in a good starting position',
      body: `At ${bf.toFixed(1)}%, you have a solid base. A structured 12-week cut combining a 300–400 kcal deficit with 3x/week resistance training can realistically get you to the Fitness range.`,
      color: '#FBBF24',
      tag: 'Mindset',
    });
  }

  if (category === 'Fitness') {
    recs.push({
      title: 'Dial in the details',
      body: `At ${bf.toFixed(1)}% you're in the fitness range. Getting leaner from here requires dialling in sleep (7–9h), managing stress, and being precise with nutrition — the basics matter more.`,
      color: '#7C6FE0',
      tag: 'Recovery',
    });
  }

  if (category === 'Athletes') {
    recs.push({
      title: 'Maintenance is the goal',
      body: `At ${bf.toFixed(1)}% you're already in athlete range. Focus on performance, recovery, and diet breaks rather than aggressive cuts — sustainable maintenance beats yo-yo dieting.`,
      color: '#4ADE80',
      tag: 'Mindset',
    });
  }

  if (category === 'Essential Fat') {
    recs.push({
      title: 'Consider a reverse diet',
      body: `At ${bf.toFixed(1)}% you're near essential fat levels. This is hard to maintain long-term. A slow reverse diet — adding 50–100 kcal/week — will help you gain muscle without rapid fat gain.`,
      color: '#FF6584',
      tag: 'Nutrition',
    });
  }

  // Return at most 3 most relevant recs
  return recs.slice(0, 3);
}

// ─── Checklist Sheet ───────────────────────────────────────────────────────────

function ChecklistSheet({ visible, onClose, theme }: { visible: boolean; onClose: () => void; theme: Theme }) {
  const { items, toggle, addItem, editItem, deleteItem } = useChecklistStore();
  const [newText, setNewText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const s = useMemo(() => sheetStyles(theme), [theme]);

  const completedCount = items.filter((i) => i.completed).length;
  const totalCount = items.length;

  const handleAdd = async () => {
    if (!newText.trim()) return;
    await addItem(newText.trim());
    setNewText('');
  };

  const startEdit = (id: string, text: string) => {
    setEditingId(id);
    setEditingText(text);
  };

  const commitEdit = async () => {
    if (editingId && editingText.trim()) {
      await editItem(editingId, editingText.trim());
    }
    setEditingId(null);
    setEditingText('');
  };


  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={s.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={s.sheet}>
          {/* Handle */}
          <View style={s.handle} />

          {/* Header */}
          <View style={s.sheetHeader}>
            <View>
              <Text style={s.sheetTitle}>Daily Checklist</Text>
              {totalCount > 0 && (
                <Text style={s.sheetSubtitle}>{completedCount} of {totalCount} done</Text>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Text style={s.closeBtnText}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* Progress bar */}
          {totalCount > 0 && (
            <View style={s.progressTrack}>
              <View style={[s.progressFill, {
                width: `${(completedCount / totalCount) * 100}%`,
                backgroundColor: completedCount === totalCount ? '#4ADE80' : theme.accent,
              }]} />
            </View>
          )}

          {/* Items */}
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            style={s.list}
            contentContainerStyle={s.listContent}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <Text style={s.emptyText}>No items yet. Add your first habit below.</Text>
            }
            ItemSeparatorComponent={() => <View style={s.separator} />}
            renderItem={({ item }) => (
              <Swipeable
                renderRightActions={() => (
                  <TouchableOpacity style={s.deleteAction} onPress={() => deleteItem(item.id)}>
                    <Text style={s.deleteActionText}>Delete</Text>
                  </TouchableOpacity>
                )}
                rightThreshold={60}
                overshootRight={false}
              >
                <View style={s.row}>
                  {/* Checkbox */}
                  <TouchableOpacity onPress={() => toggle(item.id)} style={s.checkboxWrap}>
                    <View style={[s.checkbox, item.completed && s.checkboxDone]}>
                      {item.completed && <Text style={s.checkmark}>✓</Text>}
                    </View>
                  </TouchableOpacity>

                  {/* Text / edit field */}
                  {editingId === item.id ? (
                    <TextInput
                      style={s.editInput}
                      value={editingText}
                      onChangeText={setEditingText}
                      autoFocus
                      returnKeyType="done"
                      onSubmitEditing={commitEdit}
                      onBlur={commitEdit}
                      selectTextOnFocus
                    />
                  ) : (
                    <TouchableOpacity style={s.textWrap} onLongPress={() => startEdit(item.id, item.text)} activeOpacity={0.7}>
                      <Text style={[s.itemText, item.completed && s.itemTextDone]}>{item.text}</Text>
                      <Text style={s.editHint}>Hold to edit</Text>
                    </TouchableOpacity>
                  )}

                  {/* Save button when editing */}
                  {editingId === item.id && (
                    <TouchableOpacity onPress={commitEdit} style={s.actionBtn}>
                      <Text style={[s.actionBtnText, { color: theme.accent }]}>Save</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </Swipeable>
            )}
          />

          {/* Add new */}
          <View style={s.addRow}>
            <TextInput
              style={s.addInput}
              value={newText}
              onChangeText={setNewText}
              placeholder="Add a habit..."
              placeholderTextColor={theme.textMuted}
              returnKeyType="done"
              onSubmitEditing={handleAdd}
            />
            <TouchableOpacity
              style={[s.addBtn, !newText.trim() && s.addBtnDisabled]}
              onPress={handleAdd}
              disabled={!newText.trim()}
            >
              <Text style={s.addBtnText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const sheetStyles = (theme: Theme) => StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: theme.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderTopWidth: 1, borderColor: theme.border,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: theme.border, alignSelf: 'center', marginTop: 10, marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  sheetTitle: { color: theme.text, fontSize: 20, fontWeight: '800' },
  sheetSubtitle: { color: theme.textMuted, fontSize: 13, marginTop: 2 },
  closeBtn: {
    backgroundColor: theme.surface2, borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 7,
    borderWidth: 1, borderColor: theme.border,
  },
  closeBtnText: { color: theme.accent, fontSize: 14, fontWeight: '600' },
  progressTrack: {
    height: 3, backgroundColor: theme.surface2,
    marginHorizontal: 20, borderRadius: 2, marginBottom: 8, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 2 },
  list: { flexGrow: 0 },
  listContent: { paddingHorizontal: 20, paddingVertical: 4 },
  emptyText: { color: theme.textMuted, fontSize: 14, textAlign: 'center', paddingVertical: 24 },
  separator: { height: 1, backgroundColor: theme.border },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, gap: 12 },
  checkboxWrap: { padding: 2 },
  checkbox: {
    width: 24, height: 24, borderRadius: 7,
    borderWidth: 2, borderColor: theme.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxDone: { backgroundColor: '#4ADE80', borderColor: '#4ADE80' },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '800' },
  textWrap: { flex: 1 },
  itemText: { color: theme.text, fontSize: 15, lineHeight: 20 },
  itemTextDone: { color: theme.textMuted, textDecorationLine: 'line-through' },
  editHint: { color: theme.textMuted, fontSize: 10, marginTop: 1 },
  editInput: {
    flex: 1, color: theme.text, fontSize: 15,
    borderBottomWidth: 1.5, borderBottomColor: theme.accent,
    paddingVertical: 2,
  },
  actionBtn: { padding: 6 },
  actionBtnText: { fontSize: 14, fontWeight: '700' },
  deleteBtnText: { color: theme.textMuted, fontSize: 16 },
  addRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: theme.border,
  },
  addInput: {
    flex: 1, backgroundColor: theme.surface2,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    color: theme.text, fontSize: 15,
    borderWidth: 1, borderColor: theme.border,
  },
  addBtn: {
    backgroundColor: theme.accent, borderRadius: 12,
    paddingHorizontal: 18, paddingVertical: 12,
  },
  addBtnDisabled: { opacity: 0.4 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  deleteAction: {
    backgroundColor: '#F87171',
    justifyContent: 'center', alignItems: 'center',
    width: 80, marginVertical: 0,
  },
  deleteActionText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

// ─── Home Screen ───────────────────────────────────────────────────────────────

export default function HomeScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { profile, goal, loadProfile } = useUserStore();
  const { assessments, loadHistory } = useHistoryStore();
  const { items, load: loadChecklist } = useChecklistStore();

  const [checklistOpen, setChecklistOpen] = useState(false);

  useEffect(() => {
    loadProfile();
    loadHistory();
    loadChecklist();
  }, []);

  const lastAssessment = assessments[0];
  const s = useMemo(() => makeStyles(theme), [theme]);

  const segments = getBfSegments(lastAssessment?.userProfile?.sex ?? profile?.sex ?? 'male');
  const bfPercent = lastAssessment ? getBfProgressPercent(lastAssessment.result.bodyFat) : 0;
  const trendInsight = useMemo(() => getTrendInsight(assessments), [assessments]);
  const trendRecs = useMemo(() => getTrendRecommendations(assessments), [assessments]);
  const todaysTip = useMemo(() => getTodaysTip(), []);

  const goalProgress = goal && lastAssessment ? {
    current: lastAssessment.result.bodyFat,
    target: goal.targetBodyFat,
    diff: lastAssessment.result.bodyFat - goal.targetBodyFat,
    deadline: goal.deadline,
  } : null;

  const remainingCount = items.filter((i) => !i.completed).length;
  const totalCount = items.length;
  const allDone = totalCount > 0 && remainingCount === 0;

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>{getGreeting()}</Text>
            <Text style={s.appName}>NattyAI</Text>
          </View>

          {/* Checklist badge */}
          <TouchableOpacity style={s.badgeBtn} onPress={() => setChecklistOpen(true)} activeOpacity={0.7}>
            <Text style={s.badgeIcon}>☑</Text>
            {totalCount > 0 && (
              <View style={[s.badge, allDone ? s.badgeDone : s.badgePending]}>
                <Text style={s.badgeText}>
                  {allDone ? '✓' : String(remainingCount)}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Profile warning banner */}
        {!profile && (
          <View style={s.warningBanner}>
            <Text style={s.warningText}>Set up your profile for more accurate results.</Text>
            <TouchableOpacity onPress={() => (navigation as any).navigate('Main', { screen: 'Settings' })}>
              <Text style={s.warningAction}>Go to Settings →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Trend insight */}
        {trendInsight && (
          <View style={[s.insightCard, { borderColor: trendInsight.color + '40' }]}>
            <View style={[s.insightDot, { backgroundColor: trendInsight.color }]} />
            <Text style={[s.insightText, { color: trendInsight.color }]}>{trendInsight.text}</Text>
          </View>
        )}

        {/* Goal progress */}
        {goalProgress && (
          <View style={s.card}>
            <Text style={s.cardLabel}>GOAL PROGRESS</Text>
            <View style={s.goalRow}>
              <View style={s.goalInfo}>
                <Text style={s.goalCurrent}>{goalProgress.current.toFixed(1)}%</Text>
                <Text style={s.goalLabel}>Current</Text>
              </View>
              <Text style={s.goalArrow}>→</Text>
              <View style={s.goalInfo}>
                <Text style={[s.goalTarget, { color: theme.accent }]}>{goalProgress.target.toFixed(1)}%</Text>
                <Text style={s.goalLabel}>Target</Text>
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={[s.goalDiff, { color: goalProgress.diff <= 0 ? '#4ADE80' : '#FBBF24' }]}>
                  {goalProgress.diff <= 0 ? 'Goal reached!' : `${goalProgress.diff.toFixed(1)}% to go`}
                </Text>
                {goalProgress.deadline && (
                  <Text style={s.goalDeadline}>
                    by {new Date(goalProgress.deadline + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Text>
                )}
              </View>
            </View>
            {goalProgress.diff > 0 && (
              <View style={s.goalBarTrack}>
                <View style={[s.goalBarFill, {
                  width: `${Math.min(100, Math.max(0, (1 - goalProgress.diff / (goalProgress.current + goalProgress.diff)) * 100))}%`,
                  backgroundColor: theme.accent,
                }]} />
              </View>
            )}
          </View>
        )}

        {/* Last assessment */}
        {lastAssessment && lastAssessment.result.bodyFat != null && (
          <View style={s.card}>
            <Text style={s.cardLabel}>LAST ASSESSMENT</Text>
            <View style={s.lastResultRow}>
              <Text style={s.bfLarge}>{lastAssessment.result.bodyFat.toFixed(1)}%</Text>
              <View style={[s.categoryBadge, { backgroundColor: theme.accentDim, borderColor: theme.accent }]}>
                <Text style={[s.categoryBadgeText, { color: theme.accent }]}>{lastAssessment.result.category}</Text>
              </View>
            </View>
            {lastAssessment.note ? (
              <Text style={s.assessmentNote} numberOfLines={1}>"{lastAssessment.note}"</Text>
            ) : null}
            <Text style={s.lastDate}>
              {new Date(lastAssessment.createdAt).toLocaleDateString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
              })}
            </Text>
            <View style={s.progressBarTrack}>
              {segments.map((seg, i) => {
                const prev = i > 0 ? segments[i - 1].max : 0;
                const w = ((seg.max - prev) / BF_SCALE_MAX) * 100;
                return <View key={seg.label} style={[s.progressSegment, { width: `${w}%`, backgroundColor: seg.color }]} />;
              })}
              <View style={[s.progressMarker, { left: `${bfPercent}%` }]}>
                <View style={s.progressMarkerLine} />
              </View>
            </View>
            <View style={s.progressLabels}>
              {segments.map((seg) => (
                <Text key={seg.label} style={[s.progressLabel, { color: seg.color }]}>{seg.label}</Text>
              ))}
            </View>
          </View>
        )}

        {/* CTAs */}
        <TouchableOpacity style={s.primaryBtn} onPress={() => navigation.navigate('Camera', { step: 'front' })}>
          <Text style={s.primaryBtnText}>New Assessment</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.secondaryBtn} onPress={() => navigation.navigate('Compare')}>
          <Text style={s.secondaryBtnText}>Before & After</Text>
        </TouchableOpacity>

        {/* Trend-based recommendations */}
        {trendRecs.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Your Recommendations</Text>
            {trendRecs.map((rec, i) => (
              <View key={i} style={[s.recCard, { borderLeftColor: CATEGORY_COLORS[rec.tag] ?? theme.accent }]}>
                <View style={s.recCardHeader}>
                  <View style={[s.recTagBadge, { backgroundColor: (CATEGORY_COLORS[rec.tag] ?? theme.accent) + '22' }]}>
                    <Text style={[s.recTag, { color: CATEGORY_COLORS[rec.tag] ?? theme.accent }]}>{rec.tag}</Text>
                  </View>
                </View>
                <Text style={s.recTitle}>{rec.title}</Text>
                <Text style={s.recBody}>{rec.body}</Text>
              </View>
            ))}
          </>
        )}

        {/* Tip of the day */}
        <Text style={s.sectionTitle}>Tip of the Day</Text>
        <View style={[s.tipCard, { borderLeftColor: CATEGORY_COLORS[todaysTip.category] ?? theme.accent }]}>
          <View style={[s.tipBadge, { backgroundColor: (CATEGORY_COLORS[todaysTip.category] ?? theme.accent) + '22' }]}>
            <Text style={[s.tipCategory, { color: CATEGORY_COLORS[todaysTip.category] ?? theme.accent }]}>
              {todaysTip.category}
            </Text>
          </View>
          <Text style={s.tipText}>{todaysTip.tip}</Text>
        </View>

      </ScrollView>

      <ChecklistSheet visible={checklistOpen} onClose={() => setChecklistOpen(false)} theme={theme} />
    </SafeAreaView>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  scroll: { padding: 24, paddingBottom: 80 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 20,
  },
  greeting: { color: theme.textSecondary, fontSize: 14, fontWeight: '500', marginBottom: 2 },
  appName: { color: theme.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },

  badgeBtn: { position: 'relative', padding: 4, marginTop: 4 },
  badgeIcon: { fontSize: 26, color: theme.textSecondary },
  badge: {
    position: 'absolute', top: 0, right: 0,
    minWidth: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgePending: { backgroundColor: theme.accent },
  badgeDone: { backgroundColor: '#4ADE80' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  warningBanner: {
    backgroundColor: theme.isDark ? '#1A1100' : '#FFFBEB',
    borderRadius: 14, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: theme.warning,
  },
  warningText: { color: theme.warning, fontSize: 14, marginBottom: 6 },
  warningAction: { color: theme.warning, fontWeight: '700', fontSize: 14 },

  insightCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: theme.surface, borderRadius: 14,
    borderWidth: 1, padding: 14, marginBottom: 14,
  },
  insightDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  insightText: { fontSize: 14, fontWeight: '600', flex: 1 },

  card: {
    backgroundColor: theme.surface, borderRadius: 20,
    borderWidth: 1, borderColor: theme.border,
    padding: 20, marginBottom: 14,
  },
  cardLabel: { color: theme.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 14 },

  goalRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  goalInfo: { alignItems: 'center' },
  goalCurrent: { color: theme.text, fontSize: 22, fontWeight: '800' },
  goalTarget: { fontSize: 22, fontWeight: '800' },
  goalLabel: { color: theme.textMuted, fontSize: 11, fontWeight: '600', marginTop: 2 },
  goalArrow: { color: theme.textMuted, fontSize: 20 },
  goalDiff: { fontSize: 13, fontWeight: '700' },
  goalDeadline: { color: theme.textMuted, fontSize: 11, marginTop: 2 },
  goalBarTrack: { height: 6, backgroundColor: theme.surface2, borderRadius: 3, overflow: 'hidden' },
  goalBarFill: { height: '100%', borderRadius: 3 },

  lastResultRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 4 },
  bfLarge: { color: theme.accent, fontSize: 48, fontWeight: '800', lineHeight: 54, letterSpacing: -1 },
  categoryBadge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, alignSelf: 'center' },
  categoryBadgeText: { fontSize: 13, fontWeight: '700' },
  assessmentNote: { color: theme.textSecondary, fontSize: 13, fontStyle: 'italic', marginBottom: 4 },
  lastDate: { color: theme.textSecondary, fontSize: 13, marginBottom: 14 },

  progressBarTrack: { height: 8, flexDirection: 'row', borderRadius: 4, overflow: 'visible', position: 'relative' },
  progressSegment: { height: '100%' },
  progressMarker: { position: 'absolute', top: -5, alignItems: 'center', transform: [{ translateX: -1 }] },
  progressMarkerLine: { width: 3, height: 18, backgroundColor: theme.text, borderRadius: 2 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  progressLabel: { fontSize: 9, fontWeight: '600' },

  primaryBtn: {
    backgroundColor: theme.accent, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginBottom: 12,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  secondaryBtn: {
    backgroundColor: theme.surface, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
    borderWidth: 1, borderColor: theme.border, marginBottom: 28,
  },
  secondaryBtnText: { color: theme.accent, fontSize: 16, fontWeight: '600' },

  sectionTitle: { color: theme.text, fontSize: 17, fontWeight: '700', marginBottom: 12 },

  recCard: {
    backgroundColor: theme.surface, borderRadius: 16,
    borderWidth: 1, borderColor: theme.border,
    borderLeftWidth: 4, padding: 16, marginBottom: 12,
  },
  recCardHeader: { marginBottom: 8 },
  recTagBadge: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  recTag: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  recTitle: { color: theme.text, fontSize: 15, fontWeight: '700', marginBottom: 6 },
  recBody: { color: theme.textSecondary, fontSize: 14, lineHeight: 21 },

  tipCard: {
    backgroundColor: theme.surface, borderRadius: 16,
    borderWidth: 1, borderColor: theme.border,
    borderLeftWidth: 4, padding: 18,
  },
  tipBadge: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 10 },
  tipCategory: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  tipText: { color: theme.textSecondary, fontSize: 14, lineHeight: 22 },
});
