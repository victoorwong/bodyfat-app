import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { Theme } from '../theme';
import { useUserStore } from '../stores/userStore';
import { useHistoryStore } from '../stores/historyStore';
import { Sex } from '../types';
import { formatHeight, formatWeight, lbsToKg, cmToTotalInches, inchesToCm } from '../utils/units';

export default function SettingsScreen() {
  const { theme, isDark, toggleTheme } = useTheme();
  const { profile, goal, unit, setUnit, setGoal, setProfile, loadProfile } = useUserStore();
  const { assessments, clearHistory } = useHistoryStore();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // Goal modal state
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [targetBf, setTargetBf] = useState(String(goal?.targetBodyFat ?? ''));
  const [deadline, setDeadline] = useState(goal?.deadline ?? '');

  // Profile edit modal state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<Sex>('male');

  useEffect(() => { loadProfile(); }, []);

  useEffect(() => {
    if (profile) {
      const u = unit ?? 'metric';
      setHeight(u === 'imperial' ? String(cmToTotalInches(profile.height)) : String(profile.height));
      setWeight(u === 'imperial' ? String(Math.round(profile.weight * 2.2046)) : String(profile.weight));
      setAge(String(profile.age));
      setSex(profile.sex);
    }
  }, [profile, unit, showProfileModal]);

  const handleSaveProfile = async () => {
    const h = parseFloat(height);
    const w = parseFloat(weight);
    const a = parseInt(age, 10);
    if (!h || !w || !a) {
      Alert.alert('Invalid', 'Please fill in all fields.');
      return;
    }
    const heightCm = unit === 'imperial' ? inchesToCm(h) : h;
    const weightKg = unit === 'imperial' ? lbsToKg(w) : w;
    await setProfile({ height: heightCm, weight: weightKg, age: a, sex });
    setShowProfileModal(false);
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Clear History',
      `Delete all ${assessments.length} assessments? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear All', style: 'destructive', onPress: () => clearHistory() },
      ]
    );
  };

  const handleSaveGoal = async () => {
    const target = parseFloat(targetBf);
    if (isNaN(target) || target < 1 || target > 60) {
      Alert.alert('Invalid', 'Enter a body fat % between 1 and 60.');
      return;
    }
    await setGoal({ targetBodyFat: target, deadline: deadline.trim() || undefined });
    setShowGoalModal(false);
  };

  const handleRemoveGoal = async () => {
    await setGoal(null);
    setTargetBf('');
    setDeadline('');
    setShowGoalModal(false);
  };

  const handleToggleNotifications = async (value: boolean) => {
    if (value) {
      const { default: Notifications } = await import('expo-notifications');
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Notification permissions are needed for reminders.');
        return;
      }
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'NattyAI',
          body: 'Time for your weekly body composition check-in!',
        },
        trigger: {
          type: 'weekly' as any,
          weekday: 2,
          hour: 9,
          minute: 0,
        },
      });
      Alert.alert('Reminders On', 'Weekly check-in reminders scheduled for Monday mornings.');
    } else {
      const { default: Notifications } = await import('expo-notifications');
      await Notifications.cancelAllScheduledNotificationsAsync();
    }
    setNotificationsEnabled(value);
  };

  const heightLabel = unit === 'imperial' ? 'Height (in)' : 'Height (cm)';
  const weightLabel = unit === 'imperial' ? 'Weight (lbs)' : 'Weight (kg)';

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.pageTitle}>Settings</Text>

        {/* Appearance */}
        <Text style={s.sectionLabel}>APPEARANCE</Text>
        <View style={s.card}>
          <Row label="Dark Mode" theme={theme}>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: theme.border, true: theme.accent }}
              thumbColor="#fff"
            />
          </Row>
        </View>

        {/* Units */}
        <Text style={s.sectionLabel}>UNITS</Text>
        <View style={s.card}>
          <Text style={s.rowLabel}>Measurement System</Text>
          <View style={s.segmentRow}>
            <TouchableOpacity
              style={[s.segmentBtn, unit === 'metric' && s.segmentBtnActive]}
              onPress={() => setUnit('metric')}
            >
              <Text style={[s.segmentBtnText, unit === 'metric' && s.segmentBtnTextActive]}>Metric</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.segmentBtn, unit === 'imperial' && s.segmentBtnActive]}
              onPress={() => setUnit('imperial')}
            >
              <Text style={[s.segmentBtnText, unit === 'imperial' && s.segmentBtnTextActive]}>Imperial</Text>
            </TouchableOpacity>
          </View>
          <Text style={s.hint}>{unit === 'metric' ? 'kg, cm' : 'lbs, ft/in'}</Text>
        </View>

        {/* Profile */}
        <Text style={s.sectionLabel}>PROFILE</Text>
        <View style={s.card}>
          {profile ? (
            <>
              <Row label="Height" theme={theme}>
                <Text style={s.rowValue}>{formatHeight(profile.height, unit)}</Text>
              </Row>
              <Divider theme={theme} />
              <Row label="Weight" theme={theme}>
                <Text style={s.rowValue}>{formatWeight(profile.weight, unit)}</Text>
              </Row>
              <Divider theme={theme} />
              <Row label="Age" theme={theme}>
                <Text style={s.rowValue}>{profile.age}</Text>
              </Row>
              <Divider theme={theme} />
              <Row label="Biological Sex" theme={theme}>
                <Text style={s.rowValue}>{profile.sex === 'male' ? 'Male' : 'Female'}</Text>
              </Row>
              <Divider theme={theme} />
            </>
          ) : (
            <Text style={s.noData}>No profile set up yet.</Text>
          )}
          <TouchableOpacity style={s.actionRow} onPress={() => setShowProfileModal(true)}>
            <Text style={s.actionRowText}>{profile ? 'Edit Profile' : 'Set Up Profile'}</Text>
          </TouchableOpacity>
        </View>

        {/* Goal */}
        <Text style={s.sectionLabel}>GOAL</Text>
        <View style={s.card}>
          {goal ? (
            <>
              <Row label="Target Body Fat" theme={theme}>
                <Text style={s.rowValue}>{goal.targetBodyFat}%</Text>
              </Row>
              {goal.deadline && (
                <>
                  <Divider theme={theme} />
                  <Row label="Deadline" theme={theme}>
                    <Text style={s.rowValue}>
                      {new Date(goal.deadline + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                  </Row>
                </>
              )}
              <Divider theme={theme} />
            </>
          ) : (
            <Text style={s.noData}>No goal set.</Text>
          )}
          <TouchableOpacity style={s.actionRow} onPress={() => setShowGoalModal(true)}>
            <Text style={s.actionRowText}>{goal ? 'Edit Goal' : 'Set a Goal'}</Text>
          </TouchableOpacity>
        </View>

        {/* Notifications */}
        <Text style={s.sectionLabel}>REMINDERS</Text>
        <View style={s.card}>
          <Row label="Weekly Check-in" theme={theme}>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: theme.border, true: theme.accent }}
              thumbColor="#fff"
            />
          </Row>
          <Text style={s.hint}>Reminds you every Monday morning to take a new assessment</Text>
        </View>

        {/* Data */}
        <Text style={s.sectionLabel}>DATA</Text>
        <View style={s.card}>
          <Row label="Assessments stored" theme={theme}>
            <Text style={s.rowValue}>{assessments.length}</Text>
          </Row>
          <Divider theme={theme} />
          <TouchableOpacity
            style={s.destructiveRow}
            onPress={handleClearHistory}
            disabled={assessments.length === 0}
            activeOpacity={0.7}
          >
            <Text style={[s.destructiveLabel, assessments.length === 0 && { opacity: 0.4 }]}>
              Clear All History
            </Text>
          </TouchableOpacity>
        </View>

        {/* About */}
        <Text style={s.sectionLabel}>ABOUT</Text>
        <View style={s.card}>
          <Row label="App" theme={theme}>
            <Text style={s.rowValue}>NattyAI</Text>
          </Row>
          <Divider theme={theme} />
          <Row label="Version" theme={theme}>
            <Text style={s.rowValue}>1.0.0</Text>
          </Row>
          <Divider theme={theme} />
          <Row label="Model" theme={theme}>
            <Text style={s.rowValue}>Claude Opus 4</Text>
          </Row>
        </View>

        <Text style={s.disclaimer}>
          NattyAI estimates are for informational purposes only and are not a substitute for professional medical advice.
        </Text>
      </ScrollView>

      {/* Profile Modal */}
      <Modal visible={showProfileModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={s.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>Edit Profile</Text>
            <Text style={s.modalSubtitle}>Used to calibrate body fat estimates</Text>

            <Text style={s.inputLabel}>{heightLabel}</Text>
            <TextInput
              style={s.input}
              value={height}
              onChangeText={setHeight}
              keyboardType="numeric"
              placeholder={unit === 'imperial' ? 'e.g. 70' : 'e.g. 175'}
              placeholderTextColor={theme.textMuted}
            />

            <Text style={s.inputLabel}>{weightLabel}</Text>
            <TextInput
              style={s.input}
              value={weight}
              onChangeText={setWeight}
              keyboardType="numeric"
              placeholder={unit === 'imperial' ? 'e.g. 165' : 'e.g. 75'}
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

            <TouchableOpacity style={s.saveBtn} onPress={handleSaveProfile}>
              <Text style={s.saveBtnText}>Save Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.cancelBtn} onPress={() => setShowProfileModal(false)}>
              <Text style={s.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Goal Modal */}
      <Modal visible={showGoalModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={s.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>Set a Goal</Text>
            <Text style={s.modalSubtitle}>Track progress toward a target body fat %</Text>

            <Text style={s.inputLabel}>Target Body Fat %</Text>
            <TextInput
              style={s.input}
              value={targetBf}
              onChangeText={setTargetBf}
              keyboardType="decimal-pad"
              placeholder="e.g. 15"
              placeholderTextColor={theme.textMuted}
            />

            <Text style={s.inputLabel}>Deadline (optional, YYYY-MM-DD)</Text>
            <TextInput
              style={s.input}
              value={deadline}
              onChangeText={setDeadline}
              placeholder="e.g. 2026-06-01"
              placeholderTextColor={theme.textMuted}
            />

            <TouchableOpacity style={s.saveBtn} onPress={handleSaveGoal}>
              <Text style={s.saveBtnText}>Save Goal</Text>
            </TouchableOpacity>
            {goal && (
              <TouchableOpacity style={s.removeBtn} onPress={handleRemoveGoal}>
                <Text style={s.removeBtnText}>Remove Goal</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={s.cancelBtn} onPress={() => setShowGoalModal(false)}>
              <Text style={s.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function Row({ label, children, theme }: { label: string; children: React.ReactNode; theme: Theme }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13 }}>
      <Text style={{ color: theme.text, fontSize: 15 }}>{label}</Text>
      {children}
    </View>
  );
}

function Divider({ theme }: { theme: Theme }) {
  return <View style={{ height: 1, backgroundColor: theme.border }} />;
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  scroll: { padding: 20, paddingBottom: 48 },
  pageTitle: { color: theme.text, fontSize: 28, fontWeight: '800', marginBottom: 24 },
  sectionLabel: {
    color: theme.textMuted, fontSize: 11, fontWeight: '700',
    letterSpacing: 1.2, marginBottom: 8, marginLeft: 4,
  },
  card: {
    backgroundColor: theme.surface, borderRadius: 16,
    borderWidth: 1, borderColor: theme.border,
    paddingHorizontal: 16, marginBottom: 24,
  },
  rowLabel: { color: theme.text, fontSize: 15, paddingTop: 14, marginBottom: 10 },
  rowValue: { color: theme.textSecondary, fontSize: 15 },
  hint: { color: theme.textMuted, fontSize: 12, paddingBottom: 14 },
  noData: { color: theme.textMuted, fontSize: 14, paddingVertical: 14 },
  actionRow: { paddingVertical: 14 },
  actionRowText: { color: theme.accent, fontSize: 15, fontWeight: '600' },
  segmentRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  segmentBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    alignItems: 'center', backgroundColor: theme.surface2,
    borderWidth: 1, borderColor: theme.border,
  },
  segmentBtnActive: { backgroundColor: theme.accent, borderColor: theme.accent },
  segmentBtnText: { color: theme.textSecondary, fontWeight: '600', fontSize: 14 },
  segmentBtnTextActive: { color: '#FFFFFF' },
  destructiveRow: { paddingVertical: 14 },
  destructiveLabel: { color: theme.danger, fontSize: 15, fontWeight: '600' },
  disclaimer: {
    color: theme.textMuted, fontSize: 12, textAlign: 'center',
    lineHeight: 18, marginTop: 8,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: theme.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 28, paddingBottom: 44,
    borderTopWidth: 1, borderColor: theme.border,
  },
  modalTitle: { color: theme.text, fontSize: 22, fontWeight: '800', marginBottom: 4 },
  modalSubtitle: { color: theme.textSecondary, fontSize: 14, marginBottom: 16 },
  inputLabel: { color: theme.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 10 },
  input: {
    backgroundColor: theme.surface2, borderRadius: 12, padding: 14,
    color: theme.text, fontSize: 16, borderWidth: 1, borderColor: theme.border,
  },
  sexRow: { flexDirection: 'row', gap: 12, marginTop: 4, marginBottom: 24 },
  sexBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 12,
    alignItems: 'center', backgroundColor: theme.surface2,
    borderWidth: 1, borderColor: theme.border,
  },
  sexBtnActive: { backgroundColor: theme.accent, borderColor: theme.accent },
  sexBtnText: { color: theme.textSecondary, fontWeight: '600', fontSize: 15 },
  sexBtnTextActive: { color: '#FFFFFF' },
  saveBtn: { backgroundColor: theme.accent, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  removeBtn: { paddingVertical: 14, alignItems: 'center' },
  removeBtnText: { color: theme.danger, fontSize: 15, fontWeight: '600' },
  cancelBtn: { paddingVertical: 14, alignItems: 'center' },
  cancelBtnText: { color: theme.textMuted, fontSize: 15 },
});
