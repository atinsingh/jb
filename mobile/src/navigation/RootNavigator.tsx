import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { useAuth } from '../auth/AuthContext';
import { colors } from '../theme';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import MatchesScreen from '../screens/MatchesScreen';
import JobDetailScreen from '../screens/JobDetailScreen';
import TrackerScreen from '../screens/TrackerScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import type { Match } from '../api/endpoints';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MatchesStackParamList = {
  MatchesList: undefined;
  JobDetail: { job: Match };
};

export type AppTabsParamList = {
  Matches: undefined;
  Tracker: undefined;
  Notifications: undefined;
  Profile: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MatchesStack = createNativeStackNavigator<MatchesStackParamList>();
const Tabs = createBottomTabNavigator<AppTabsParamList>();

const headerStyle = {
  headerStyle: { backgroundColor: colors.cream },
  headerTintColor: colors.ink,
  headerShadowVisible: false,
};

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

function MatchesNavigator() {
  return (
    <MatchesStack.Navigator screenOptions={headerStyle}>
      <MatchesStack.Screen
        name="MatchesList"
        component={MatchesScreen}
        options={{ title: 'Matches' }}
      />
      <MatchesStack.Screen
        name="JobDetail"
        component={JobDetailScreen}
        options={{ title: 'Job detail' }}
      />
    </MatchesStack.Navigator>
  );
}

const tabIcon =
  (glyph: string) =>
  ({ focused }: { focused: boolean }) =>
    <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.5 }}>{glyph}</Text>;

function AppTabs() {
  return (
    <Tabs.Navigator
      screenOptions={{
        ...headerStyle,
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.white },
      }}
    >
      <Tabs.Screen
        name="Matches"
        component={MatchesNavigator}
        options={{ headerShown: false, tabBarIcon: tabIcon('🎯') }}
      />
      <Tabs.Screen
        name="Tracker"
        component={TrackerScreen}
        options={{ tabBarIcon: tabIcon('📋') }}
      />
      <Tabs.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ tabBarIcon: tabIcon('🔔') }}
      />
      <Tabs.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarIcon: tabIcon('👤') }}
      />
    </Tabs.Navigator>
  );
}

export default function RootNavigator() {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color={colors.green} size="large" />
      </View>
    );
  }

  return token ? <AppTabs /> : <AuthNavigator />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
