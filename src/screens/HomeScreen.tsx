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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Sex } from '../types';
import { useUserStore } from '../stores/userStore';
import { useHistoryStore } from '../stores/historyStore';
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

// Body fat scale: total range 0–50%
const BF_SCALE_MAX = 50;

function getBfProgressPercent(bf: number): number {
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

export default function HomeScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { profile, loadProfile, setProfile } = useUserStore();
  const { assessments, loadHistory } = useHistoryStore();
  const [showProfileModal, setShowProfileModal] = useState(false);

  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<Sex>('male');

  useEffect(() => {
    loadProfile();
    loadHistory();
  }, []);

  useEffect(() => {
    if (profile) {
      setHeight(String(profile.height));
      setWeight(String(profile.weight));
      setAge(String(profile.age));
      setSex(profile.sex);
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    const h = parseFloat(height);
    const w = parseFloat(weight);
    const a = parseInt(age, 10);
    if (!h || !w || !a) return;
    await setProfile({ height: h, weight: w, age: a, sex });
    setShowProfileModal(false);
  };

  const lastAssessment = assessments[0];
  const s = useMemo(() => makeStyles(theme), [theme]);

  const segments = getBfSegments(lastAssessment?.userProfile?.sex ?? profile?.sex ?? 'male');
  const bfPercent = lastAssessment
    ? getBfProgressPercent(lastAssessment.result.bodyFat)
    : 0;

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.greeting}>{getGreeting()}</Text>
            <Text style={s.appName}>BodyComp AI</Text>
          </View>
          <View style={s.headerActions}>
            <TouchableOpacity
              onPress={() => setShowProfileModal(true)}
              style={s.profileBtn}
            >
              <Text style={s.profileBtnText}>{profile ? 'Edit Profile' : 'Set Up'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile warning banner */}
        {!profile && (
          <View style={s.warningBanner}>
            <Text style={s.warningText}>
              Set up your profile for more accurate results.
            </Text>
            <TouchableOpacity onPress={() => setShowProfileModal(true)}>
              <Text style={s.warningAction}>Set up now →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Profile card */}
        {profile && (
          <View style={s.card}>
            <Text style={s.cardLabel}>YOUR PROFILE</Text>
            <View style={s.profileStats}>
              <Stat label="Height" value={`${profile.height} cm`} theme={theme} />
              <Stat label="Weight" value={`${profile.weight} kg`} theme={theme} />
              <Stat label="Age" value={`${profile.age}`} theme={theme} />
              <Stat label="Sex" value={profile.sex === 'male' ? 'Male' : 'Female'} theme={theme} />
            </View>
          </View>
        )}

        {/* Last assessment card */}
        {lastAssessment && lastAssessment.result.bodyFat != null && (
          <View style={s.card}>
            <Text style={s.cardLabel}>LAST ASSESSMENT</Text>
            <View style={s.lastResultRow}>
              <Text style={s.bfLarge}>
                {lastAssessment.result.bodyFat.toFixed(1)}%
              </Text>
              <View style={[s.categoryBadge, { backgroundColor: theme.accentDim, borderColor: theme.accent }]}>
                <Text style={[s.categoryBadgeText, { color: theme.accent }]}>
                  {lastAssessment.result.category}
                </Text>
              </View>
            </View>
            <Text style={s.lastDate}>
              {new Date(lastAssessment.createdAt).toLocaleDateString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
              })}
            </Text>

            {/* Progress bar */}
            <View style={s.progressBarContainer}>
              <View style={s.progressBarTrack}>
                {segments.map((seg, i) => {
                  const prev = i > 0 ? segments[i - 1].max : 0;
                  const width = ((seg.max - prev) / BF_SCALE_MAX) * 100;
                  return (
                    <View
                      key={seg.label}
                      style={[s.progressSegment, { width: `${width}%`, backgroundColor: seg.color }]}
                    />
                  );
                })}
                {/* Marker */}
                <View style={[s.progressMarker, { left: `${bfPercent}%` }]}>
                  <View style={s.progressMarkerLine} />
                </View>
              </View>
              <View style={s.progressLabels}>
                {segments.map((seg) => (
                  <Text key={seg.label} style={[s.progressLabel, { color: seg.color }]}>
                    {seg.label}
                  </Text>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Primary CTA */}
        <TouchableOpacity
          style={s.primaryBtn}
          onPress={() => navigation.navigate('Camera', { step: 'front' })}
        >
          <Text style={s.primaryBtnText}>New Assessment</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.secondaryBtn}
          onPress={() => navigation.navigate('Compare')}
        >
          <Text style={s.secondaryBtnText}>Before & After</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Profile Modal */}
      <Modal visible={showProfileModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={s.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>Your Profile</Text>
            <Text style={s.modalSubtitle}>Used to calibrate body fat estimates</Text>

            <Text style={s.inputLabel}>Height (cm)</Text>
            <TextInput
              style={s.input}
              value={height}
              onChangeText={setHeight}
              keyboardType="numeric"
              placeholder="e.g. 175"
              placeholderTextColor={theme.textMuted}
            />

            <Text style={s.inputLabel}>Weight (kg)</Text>
            <TextInput
              style={s.input}
              value={weight}
              onChangeText={setWeight}
              keyboardType="numeric"
              placeholder="e.g. 75"
              placeholderTextColor={theme.textMuted}
            />

            <Text style={s.inputLabel}>Age</Text>
            <TextInput
              style={s.input}
              value={age}
              onChangeText={setAge}
              keyboardType="numeric"
              placeholder="e.g. 30"
              placeholderTextColor={theme.textMuted}
            />

            <Text style={s.inputLabel}>Biological Sex</Text>
            <View style={s.sexRow}>
              <TouchableOpacity
                style={[s.sexBtn, sex === 'male' && s.sexBtnActive]}
                onPress={() => setSex('male')}
              >
                <Text style={[s.sexBtnText, sex === 'male' && s.sexBtnTextActive]}>Male</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.sexBtn, sex === 'female' && s.sexBtnActive]}
                onPress={() => setSex('female')}
              >
                <Text style={[s.sexBtnText, sex === 'female' && s.sexBtnTextActive]}>Female</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={s.primaryBtn} onPress={handleSaveProfile}>
              <Text style={s.primaryBtnText}>Save Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.cancelBtn} onPress={() => setShowProfileModal(false)}>
              <Text style={s.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function Stat({ label, value, theme }: { label: string; value: string; theme: Theme }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ color: theme.text, fontSize: 18, fontWeight: '700' }}>{value}</Text>
      <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  scroll: { padding: 24, paddingBottom: 60 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
  },
  headerLeft: { flex: 1 },
  greeting: {
    color: theme.textSecondary,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  appName: {
    color: theme.text,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnText: { fontSize: 16 },
  profileBtn: {
    backgroundColor: theme.surface2,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: theme.border,
  },
  profileBtnText: { color: theme.accent, fontSize: 13, fontWeight: '600' },

  warningBanner: {
    backgroundColor: theme.isDark ? '#1A1100' : '#FFFBEB',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.warning,
  },
  warningText: { color: theme.warning, fontSize: 14, marginBottom: 6 },
  warningAction: { color: theme.warning, fontWeight: '700', fontSize: 14 },

  card: {
    backgroundColor: theme.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 20,
    marginBottom: 14,
  },
  cardLabel: {
    color: theme.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 14,
  },
  profileStats: { flexDirection: 'row', justifyContent: 'space-between' },

  lastResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 6,
  },
  bfLarge: {
    color: theme.accent,
    fontSize: 48,
    fontWeight: '800',
    lineHeight: 54,
    letterSpacing: -1,
  },
  categoryBadge: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    alignSelf: 'center',
  },
  categoryBadgeText: { fontSize: 13, fontWeight: '700' },
  lastDate: {
    color: theme.textSecondary,
    fontSize: 13,
    marginBottom: 18,
  },

  progressBarContainer: { marginTop: 4 },
  progressBarTrack: {
    height: 8,
    flexDirection: 'row',
    borderRadius: 4,
    overflow: 'visible',
    position: 'relative',
  },
  progressSegment: { height: '100%' },
  progressMarker: {
    position: 'absolute',
    top: -5,
    alignItems: 'center',
    transform: [{ translateX: -1 }],
  },
  progressMarkerLine: {
    width: 3,
    height: 18,
    backgroundColor: theme.text,
    borderRadius: 2,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  progressLabel: { fontSize: 9, fontWeight: '600' },

  secondaryRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  secondaryBtn: {
    flex: 1,
    backgroundColor: theme.surface,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },
  secondaryBtnText: { color: theme.accent, fontSize: 16, fontWeight: '600' },

  primaryBtn: {
    backgroundColor: theme.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 28,
    paddingBottom: 44,
    borderTopWidth: 1,
    borderColor: theme.border,
  },
  modalTitle: { color: theme.text, fontSize: 22, fontWeight: '800', marginBottom: 4 },
  modalSubtitle: { color: theme.textSecondary, fontSize: 14, marginBottom: 24 },
  inputLabel: {
    color: theme.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: theme.surface2,
    borderRadius: 12,
    padding: 14,
    color: theme.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  sexRow: { flexDirection: 'row', gap: 12, marginTop: 4, marginBottom: 24 },
  sexBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.border,
  },
  sexBtnActive: { backgroundColor: theme.accent, borderColor: theme.accent },
  sexBtnText: { color: theme.textSecondary, fontWeight: '600', fontSize: 15 },
  sexBtnTextActive: { color: '#FFFFFF' },
  cancelBtn: { paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  cancelBtnText: { color: theme.textMuted, fontSize: 15 },
});
