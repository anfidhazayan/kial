import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';

import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import CSOTabs from './CSOTabs';
import EntityTabs from './EntityTabs';
import StaffTabs from './StaffTabs';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) return null; // Splash handled separately

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <>
            <Stack.Screen name="Splash" component={SplashScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
          </>
        ) : user.role === 'CSO' ? (
          <Stack.Screen name="CSOMain" component={CSOTabs} />
        ) : user.role === 'ENTITY_HEAD' ? (
          <Stack.Screen name="EntityMain" component={EntityTabs} />
        ) : (
          <Stack.Screen name="StaffMain" component={StaffTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
