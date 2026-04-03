import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LineChart } from 'react-native-chart-kit';
import { Calendar } from 'react-native-calendars';
import { RootStackParamList, Assessment } from '../types';
import { useHistoryStore } from '../stores/historyStore';
import { useTheme } from '../context/ThemeContext';
import { Theme } from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Progress'>;
};

const SCREEN_WIDTH = Dimensions.get('window').width;

function toDateString(iso: string) {
  return iso.slice(0, 10);
}

function formatLabel(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function ProgressScreen({ navigation }: Props) {
  const { assessments, loadHistory } = useHistoryStore();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  useEffect(() => {
    loadHistory();
  }, []);

  const sorted = [...assessments]
    .filter((a) => a.result.bodyFat != null)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const chartPoints = sorted.length > 10
    ? sorted.filter((_, i) => i % Math.ceil(sorted.length / 10) === 0).slice(0, 10)
    : sorted;

  const chartData = {
    labels: chartPoints.map((a) => formatLabel(a.createdAt)),
    datasets: [{ data: chartPoints.map((a) => a.result.bodyFat) }],
  };

  const markedDates: Record<string, any> = {};
  assessments.forEach((a) => {
    const d = toDateString(a.createdAt);
    markedDates[d] = {
      marked: true,
      dotColor: theme.accent,
      ...(selectedDate === d ? { selected: true, selectedColor: theme.accent } : {}),
    };
  });
  if (selectedDate && !markedDates[selectedDate]) {
    markedDates[selectedDate] = { selected: true, selectedColor: theme.surface2 };
  }

  const dayAssessments = selectedDate
    ? assessments.filter((a) => toDateString(a.createdAt) === selectedDate)
    : [];

  const hasData = sorted.length >= 1;

  const totalChange = sorted.length >= 2
    ? sorted[sorted.length - 1].result.bodyFat - sorted[0].result.bodyFat
    : null;

  return (
    <SafeAreaView style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={s.title}>Progress</Text>
          <View style={{ width: 60 }} />
        </View>

        {!hasData ? (
          <View style={s.empty}>
            <Text style={s.emptyTitle}>No data yet</Text>
            <Text style={s.emptySubtitle}>Complete your first assessment to see progress.</Text>
            <TouchableOpacity style={s.startBtn} onPress={() => navigation.navigate('Camera', { step: 'front' })}>
              <Text style={s.startBtnText}>Take a Photo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Stats row */}
            <View style={s.statsRow}>
              <StatBox
                label="Assessments"
                value={String(assessments.length)}
                theme={theme}
              />
              <StatBox
                label="Current"
                value={`${sorted[sorted.length - 1].result.bodyFat.toFixed(1)}%`}
                theme={theme}
              />
              {totalChange !== null && (
                <StatBox
                  label="Change"
                  value={`${totalChange > 0 ? '+' : ''}${totalChange.toFixed(1)}%`}
                  highlight
                  positive={totalChange < 0}
                  theme={theme}
                />
              )}
            </View>

            {/* Chart */}
            {sorted.length >= 2 && (
              <View style={s.card}>
                <Text style={s.cardTitle}>Body Fat Over Time</Text>
                <LineChart
                  data={chartData}
                  width={SCREEN_WIDTH - 80}
                  height={180}
                  chartConfig={{
                    backgroundColor: theme.surface,
                    backgroundGradientFrom: theme.surface,
                    backgroundGradientTo: theme.surface,
                    decimalPlaces: 1,
                    color: (opacity = 1) => `rgba(124, 111, 224, ${opacity})`,
                    labelColor: () => theme.textSecondary,
                    propsForDots: {
                      r: '5',
                      strokeWidth: '2',
                      stroke: theme.accent,
                      fill: theme.accent,
                    },
                    propsForBackgroundLines: { stroke: theme.border },
                  }}
                  bezier
                  style={s.chart}
                  withInnerLines
                  withOuterLines={false}
                />
              </View>
            )}

            {/* Calendar */}
            <View style={s.card}>
              <Text style={s.cardTitle}>Assessment Calendar</Text>
              <Calendar
                markedDates={markedDates}
                onDayPress={(day: { dateString: string }) => {
                  setSelectedDate(prev => prev === day.dateString ? null : day.dateString);
                }}
                theme={{
                  calendarBackground: theme.surface,
                  textSectionTitleColor: theme.textSecondary,
                  selectedDayBackgroundColor: theme.accent,
                  selectedDayTextColor: '#ffffff',
                  todayTextColor: theme.accent,
                  dayTextColor: theme.text,
                  textDisabledColor: theme.textMuted,
                  dotColor: theme.accent,
                  selectedDotColor: '#ffffff',
                  arrowColor: theme.accent,
                  monthTextColor: theme.text,
                  textDayFontWeight: '500',
                  textMonthFontWeight: '700',
                  textDayHeaderFontWeight: '600',
                }}
              />
            </View>

            {/* Day detail */}
            {selectedDate && (
              <View style={s.card}>
                <Text style={s.cardTitle}>
                  {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
                    weekday: 'long', month: 'long', day: 'numeric',
                  })}
                </Text>
                {dayAssessments.length === 0 ? (
                  <Text style={s.noneText}>No assessments on this day.</Text>
                ) : (
                  dayAssessments.map((a) => (
                    <TouchableOpacity
                      key={a.id}
                      style={s.dayItem}
                      onPress={() => navigation.navigate('Results', { assessmentId: a.id })}
                    >
                      <Image source={{ uri: a.normalizedUri }} style={s.dayThumb} />
                      {a.backNormalizedUri && (
                        <Image source={{ uri: a.backNormalizedUri }} style={[s.dayThumb, s.dayThumbBack]} />
                      )}
                      <View style={s.dayInfo}>
                        <Text style={s.dayBf}>
                          {a.result.bodyFat?.toFixed(1) ?? '—'}%
                        </Text>
                        <Text style={s.dayCategory}>{a.result.category}</Text>
                        <Text style={s.dayTime}>
                          {new Date(a.createdAt).toLocaleTimeString('en-US', {
                            hour: 'numeric', minute: '2-digit',
                          })}
                        </Text>
                      </View>
                      <Text style={s.dayArrow}>›</Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBox({
  label, value, highlight, positive, theme,
}: {
  label: string; value: string; highlight?: boolean; positive?: boolean; theme: Theme;
}) {
  const valueColor = highlight
    ? (positive ? '#4ADE80' : '#F87171')
    : theme.text;
  return (
    <View style={{
      flex: 1,
      backgroundColor: theme.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 14,
      alignItems: 'center',
    }}>
      <Text style={{ fontSize: 20, fontWeight: '800', color: valueColor }}>{value}</Text>
      <Text style={{ color: theme.textMuted, fontSize: 11, fontWeight: '600', marginTop: 4 }}>{label}</Text>
    </View>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  scroll: { paddingBottom: 48 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backText: { color: theme.accent, fontSize: 15, fontWeight: '600', width: 60 },
  title: { color: theme.text, fontSize: 17, fontWeight: '700' },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 12,
    marginTop: 80,
  },
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
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 14 },
  card: {
    marginHorizontal: 20,
    backgroundColor: theme.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 20,
    marginBottom: 14,
    overflow: 'hidden',
  },
  cardTitle: { color: theme.text, fontSize: 15, fontWeight: '700', marginBottom: 14 },
  chart: { borderRadius: 12, marginLeft: -8 },
  noneText: { color: theme.textSecondary, fontSize: 14 },
  dayItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  dayThumb: { width: 48, height: 60, borderRadius: 8 },
  dayThumbBack: { marginLeft: -20 },
  dayInfo: { flex: 1 },
  dayBf: { color: theme.text, fontSize: 20, fontWeight: '800' },
  dayCategory: { color: theme.textSecondary, fontSize: 13, marginTop: 2 },
  dayTime: { color: theme.textMuted, fontSize: 12, marginTop: 2 },
  dayArrow: { color: theme.textMuted, fontSize: 22 },
});
