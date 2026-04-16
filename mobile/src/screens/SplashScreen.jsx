import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  StatusBar,
  Dimensions,
  Image,
} from 'react-native';

import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

export default function SplashScreen({ navigation }) {
  const { user, loading } = useAuth();
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate logo in
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, tension: 60, friction: 6, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
      Animated.timing(textOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();

    // Navigate after 2.5s once auth is resolved
    const timer = setTimeout(() => {
      if (!loading) {
        navigation.replace(user ? (
          user.role === 'CSO' ? 'CSOMain' : user.role === 'ENTITY_HEAD' ? 'EntityMain' : 'StaffMain'
        ) : 'Login');
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [loading, user]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Shield / Logo */}
      <Animated.View style={[styles.logoContainer, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
        <View style={styles.shieldOuter}>
          <Image
            source={require('../assets/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
      </Animated.View>

      {/* App Name */}
      <Animated.View style={{ opacity: textOpacity, alignItems: 'center' }}>
        <Text style={styles.appName}>KIAL AVSEC</Text>
        <Text style={styles.tagline}>Secure Portal</Text>

        <View style={styles.divider} />
        <Text style={styles.subtext}>Aviation Security Management System</Text>
      </Animated.View>

      {/* Bottom Airport Code */}
      <View style={styles.bottom}>
        <Text style={styles.bottomText}>Kannur International Airport</Text>
        <Text style={styles.bottomText}>IATA: CNN  •  ICAO: VOKN</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldOuter: {
    width: 130,
    height: 130,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  logoImage: {
    width: 100,
    height: 100,
  },
  appName: {
    fontSize: typography.xxl,
    fontFamily: typography.fontBold,
    color: colors.white,
    letterSpacing: 4,
  },
  tagline: {
    fontSize: typography.md,
    fontFamily: typography.fontRegular,
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 2,
    marginTop: 4,
  },
  divider: {
    width: 50,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 1,
    marginVertical: 16,
  },
  subtext: {
    fontSize: typography.sm,
    fontFamily: typography.fontRegular,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.5,
  },
  bottom: {
    position: 'absolute',
    bottom: 48,
    alignItems: 'center',
    gap: 4,
  },
  bottomText: {
    fontSize: typography.xs,
    fontFamily: typography.fontRegular,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.5,
  },
});
