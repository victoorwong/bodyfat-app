import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useTheme } from '../context/ThemeContext';

import MainTabNavigator from './MainTabNavigator';
import CameraScreen from '../screens/CameraScreen';
import ReviewScreen from '../screens/ReviewScreen';
import AnalysisScreen from '../screens/AnalysisScreen';
import ResultsScreen from '../screens/ResultsScreen';
import CompareScreen from '../screens/CompareScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { theme } = useTheme();
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Main"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.bg },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="Main" component={MainTabNavigator} />
        <Stack.Screen name="Camera" component={CameraScreen} />
        <Stack.Screen name="Review" component={ReviewScreen} />
        <Stack.Screen name="Analysis" component={AnalysisScreen} />
        <Stack.Screen name="Results" component={ResultsScreen} />
        <Stack.Screen name="Compare" component={CompareScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
