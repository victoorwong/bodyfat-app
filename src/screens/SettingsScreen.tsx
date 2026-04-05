import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { Theme } from '../theme';
import { useUserStore } from '../stores/userStore';
import { useHistoryStore } from '../stores/historyStore';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { Alert } from 'react-native';

export default function SettingsScreen() {
  const { theme, isDark, toggleTheme } = useTheme();
  const { profile } = useUserStore();
  const { assessments, clearHistory } = useHistoryStore();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const s = useMemo(() => makeStyles(theme), [theme]);

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

        {/* Profile */}
        <Text style={s.sectionLabel}>PROFILE</Text>
        <View style={s.card}>
          {profile ? (
            <>
              <Row label="Height" theme={theme}>
                <Text style={s.rowValue}>{profile.height} cm</Text>
              </Row>
              <Divider theme={theme} />
              <Row label="Weight" theme={theme}>
                <Text style={s.rowValue}>{profile.weight} kg</Text>
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
            <Text style={s.noProfile}>No profile set up yet.</Text>
          )}
          <TouchableOpacity
            style={s.editProfileBtn}
            onPress={() => navigation.navigate('Home')}
            activeOpacity={0.7}
          >
            <Text style={s.editProfileBtnText}>
              {profile ? 'Edit Profile' : 'Set Up Profile'}
            </Text>
          </TouchableOpacity>
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
            <Text style={s.rowValue}>BodyComp AI</Text>
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
          BodyComp AI estimates are for informational purposes only and are not a substitute for professional medical advice.
        </Text>
      </ScrollView>
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
  rowValue: { color: theme.textSecondary, fontSize: 15 },
  noProfile: { color: theme.textMuted, fontSize: 14, paddingVertical: 14 },
  editProfileBtn: { paddingVertical: 14 },
  editProfileBtnText: { color: theme.accent, fontSize: 15, fontWeight: '600' },
  destructiveRow: { paddingVertical: 14 },
  destructiveLabel: { color: theme.danger, fontSize: 15, fontWeight: '600' },
  disclaimer: {
    color: theme.textMuted, fontSize: 12, textAlign: 'center',
    lineHeight: 18, marginTop: 8,
  },
});
