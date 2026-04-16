import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Text } from 'react-native';
import { colors } from '../theme/colors';

// CSO Screens
import CSODashboardScreen from '../screens/cso/CSODashboardScreen';
import EntitiesListScreen from '../screens/cso/EntitiesListScreen';
import EntityDetailScreen from '../screens/cso/EntityDetailScreen';
import AddEntityScreen from '../screens/cso/AddEntityScreen';
import StaffManagementScreen from '../screens/cso/StaffManagementScreen';
import StaffDetailScreen from '../screens/cso/StaffDetailScreen';
import AddStaffScreen from '../screens/cso/AddStaffScreen';
import ApprovalsScreen from '../screens/cso/ApprovalsScreen';
import AuditLogScreen from '../screens/cso/AuditLogScreen';
import SystemOverviewScreen from '../screens/cso/SystemOverviewScreen';
import CertificateTypesScreen from '../screens/cso/CertificateTypesScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// ── Stack navigators for each tab so you can drill into details ──

function DashboardStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CSODashboard" component={CSODashboardScreen} />
      <Stack.Screen name="SystemOverview" component={SystemOverviewScreen} />
    </Stack.Navigator>
  );
}

function EntitiesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="EntitiesList" component={EntitiesListScreen} />
      <Stack.Screen name="EntityDetail" component={EntityDetailScreen} />
      <Stack.Screen name="AddEntity" component={AddEntityScreen} />
    </Stack.Navigator>
  );
}

function StaffStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="StaffManagement" component={StaffManagementScreen} />
      <Stack.Screen name="StaffDetail" component={StaffDetailScreen} />
      <Stack.Screen name="AddStaff" component={AddStaffScreen} />
    </Stack.Navigator>
  );
}

function ApprovalsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ApprovalsContent" component={ApprovalsScreen} />
    </Stack.Navigator>
  );
}

function LogsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AuditLog" component={AuditLogScreen} />
      <Stack.Screen name="CertificateTypes" component={CertificateTypesScreen} />
    </Stack.Navigator>
  );
}

export default function CSOTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ color, size, focused }) => {
          const icons = {
            Dashboard: focused ? 'home' : 'home-outline',
            Entities: focused ? 'business' : 'business-outline',
            Staff: focused ? 'people' : 'people-outline',
            Approvals: focused ? 'checkmark-circle' : 'checkmark-circle-outline',
            Logs: focused ? 'document-text' : 'document-text-outline',
          };
          return <Ionicons name={icons[route.name]} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardStack} />
      <Tab.Screen name="Entities" component={EntitiesStack} />
      <Tab.Screen name="Staff" component={StaffStack} />
      <Tab.Screen name="Approvals" component={ApprovalsStack} />
      <Tab.Screen name="Logs" component={LogsStack} />
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
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -4 },
  },
  tabLabel: {
    fontSize: 11,
    fontFamily: 'Outfit_500Medium',
    marginTop: 2,
  },
});
