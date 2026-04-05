import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

import HomeScreen from '../screens/HomeScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ProgressScreen from '../screens/ProgressScreen';
import SettingsScreen from '../screens/SettingsScreen';

export type TabParamList = {
  HomeTab: undefined;
  HistoryTab: undefined;
  NewAssessment: undefined;
  ProgressTab: undefined;
  SettingsTab: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

function CustomTabBar({ state, descriptors, navigation }: any) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.tabBar, {
      backgroundColor: theme.surface,
      borderTopColor: theme.border,
      paddingBottom: insets.bottom,
    }]}>
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const isCenter = route.name === 'NewAssessment';

        if (isCenter) {
          return (
            <TouchableOpacity
              key={route.key}
              style={styles.centerBtnWrapper}
              onPress={() => navigation.navigate('Camera', { step: 'front' })}
              activeOpacity={0.85}
            >
              <View style={[styles.centerBtn, { backgroundColor: theme.accent }]}>
                <Ionicons name="camera" size={28} color="#fff" />
              </View>
            </TouchableOpacity>
          );
        }

        const label: string =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

        const iconName = options.tabBarIconName;
        const color = isFocused ? theme.accent : theme.textMuted;

        return (
          <TouchableOpacity
            key={route.key}
            style={styles.tabItem}
            onPress={() => {
              if (!isFocused) navigation.navigate(route.name);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name={iconName} size={22} color={color} />
            <Text style={[styles.tabLabel, { color }]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
          tabBarIconName: 'home',
        } as any}
      />
      <Tab.Screen
        name="HistoryTab"
        component={HistoryScreen}
        options={{
          title: 'History',
          tabBarLabel: 'History',
          tabBarIconName: 'time-outline',
        } as any}
      />
      <Tab.Screen
        name="NewAssessment"
        component={HomeScreen}
        options={{ title: 'Scan' } as any}
      />
      <Tab.Screen
        name="ProgressTab"
        component={ProgressScreen}
        options={{
          title: 'Progress',
          tabBarLabel: 'Progress',
          tabBarIconName: 'stats-chart',
        } as any}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          tabBarLabel: 'Settings',
          tabBarIconName: 'settings-outline',
        } as any}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 8,
    height: 'auto',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 4,
    gap: 3,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  centerBtnWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 4,
  },
  centerBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
    shadowColor: '#7C6FE0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});
