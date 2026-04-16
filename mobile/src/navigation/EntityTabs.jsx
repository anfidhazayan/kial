import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

import EntityDashboardScreen from '../screens/entity/EntityDashboardScreen';
import EntityStaffListScreen from '../screens/entity/EntityStaffListScreen';
import EntityStaffDetailScreen from '../screens/entity/EntityStaffDetailScreen';
import EntityCertificatesScreen from '../screens/entity/EntityCertificatesScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function DashboardStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="EntityDashboard" component={EntityDashboardScreen} />
    </Stack.Navigator>
  );
}

function StaffStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="EntityStaffList" component={EntityStaffListScreen} />
      <Stack.Screen name="EntityStaffDetail" component={EntityStaffDetailScreen} />
    </Stack.Navigator>
  );
}

function CertificatesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="EntityCertificates" component={EntityCertificatesScreen} />
    </Stack.Navigator>
  );
}

export default function EntityTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ color, focused }) => {
          const icons = {
            Dashboard: focused ? 'home' : 'home-outline',
            Staff: focused ? 'people' : 'people-outline',
            Certificates: focused ? 'ribbon' : 'ribbon-outline',
          };
          return <Ionicons name={icons[route.name]} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardStack} />
      <Tab.Screen name="Staff" component={StaffStack} />
      <Tab.Screen name="Certificates" component={CertificatesStack} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 6,
    paddingBottom: 8,
    height: 64,
    elevation: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontFamily: 'Outfit_500Medium',
    marginTop: 2,
  },
});
