import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      // Navigation handled by RootNavigator on user state change
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Check your credentials.';
      Alert.alert('Login Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* ── Red Header ── */}
          <View style={styles.header}>
            <Image
              source={require('../assets/logo.png')}
              style={styles.headerLogoImage}
              resizeMode="contain"
            />
            <Text style={styles.headerTitle}>KIAL AVSEC</Text>
            <Text style={styles.headerSubtitle}>Aviation Security Management System</Text>
          </View>

          {/* ── White Card Form ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sign In</Text>
            <Text style={styles.cardSubtitle}>Enter your credentials to access the portal</Text>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="mail-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="your@email.com"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <Text style={styles.loginBtnText}>Sign In</Text>
                  <Ionicons name="arrow-forward" size={18} color={colors.white} />
                </>
              )}
            </TouchableOpacity>

            {/* Role hint */}
            <View style={styles.hint}>
              <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
              <Text style={styles.hintText}>Authorised personnel only. Access is monitored.</Text>
            </View>
          </View>

          {/* Footer */}
          <Text style={styles.footer}>Kannur International Airport Limited © 2025</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  scroll: { flexGrow: 1 },

  // Header
  header: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 50,
    gap: 8,
  },
  headerLogoImage: {
    width: 90,
    height: 90,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: typography.xl,
    fontFamily: typography.fontBold,
    color: colors.white,
    letterSpacing: 3,
  },
  headerSubtitle: {
    fontSize: typography.sm,
    fontFamily: typography.fontRegular,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.3,
  },

  // Card
  card: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 28,
    paddingBottom: 36,
    marginTop: -20,
    flex: 1,
  },
  cardTitle: {
    fontSize: typography.xxl,
    fontFamily: typography.fontBold,
    color: colors.text,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: typography.sm,
    fontFamily: typography.fontRegular,
    color: colors.textMuted,
    marginBottom: 28,
  },

  // Input
  inputGroup: { marginBottom: 18 },
  label: {
    fontSize: typography.sm,
    fontFamily: typography.fontMedium,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 52,
    backgroundColor: colors.background,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    fontSize: typography.base,
    fontFamily: typography.fontRegular,
    color: colors.text,
  },
  eyeBtn: { padding: 4 },

  // Button
  loginBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 20,
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  loginBtnDisabled: { opacity: 0.7 },
  loginBtnText: {
    fontSize: typography.md,
    fontFamily: typography.fontSemiBold,
    color: colors.white,
  },

  // Hint
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hintText: {
    fontSize: typography.xs,
    fontFamily: typography.fontRegular,
    color: colors.textMuted,
  },

  footer: {
    textAlign: 'center',
    fontSize: typography.xs,
    fontFamily: typography.fontRegular,
    color: colors.textMuted,
    paddingVertical: 20,
    backgroundColor: colors.surface,
  },
});
