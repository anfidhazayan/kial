import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import LoadingSpinner from '../../components/LoadingSpinner';
import { authAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function StaffProfileScreen() {
  const { user, logout, refreshUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await authAPI.getProfile();
      setProfile(res.data.user ?? res.data);
    } catch {
      // fallback to cached user
      setProfile(user);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);
  const onRefresh = () => { setRefreshing(true); fetchProfile(); };

  if (loading) return <LoadingSpinner />;
  const p = profile || user || {};

  const infoRows = [
    { label: 'Staff ID', value: p.staffId, icon: 'card-outline' },
    { label: 'Email', value: p.email, icon: 'mail-outline' },
    { label: 'Phone', value: p.phone, icon: 'call-outline' },
    { label: 'Designation', value: p.designation, icon: 'briefcase-outline' },
    { label: 'Entity', value: p.entity?.name, icon: 'business-outline' },
    { label: 'Nationality', value: p.nationality, icon: 'flag-outline' },
    { label: 'Passport', value: p.passportNumber, icon: 'document-outline' },
    { label: 'Joined', value: p.joiningDate ? new Date(p.joiningDate).toLocaleDateString() : null, icon: 'calendar-outline' },
  ].filter(r => r.value);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Hero */}
        <View style={styles.heroCard}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarText}>{p.name?.[0]?.toUpperCase() || '?'}</Text>
          </View>
          <Text style={styles.heroName}>{p.name || 'Staff Member'}</Text>
          <Text style={styles.heroRole}>{p.designation || 'Staff'}</Text>
          {p.entity?.name && (
            <View style={styles.entityPill}>
              <Ionicons name="business-outline" size={13} color={colors.primary} />
              <Text style={styles.entityPillText}>{p.entity.name}</Text>
            </View>
          )}
        </View>

        {/* Info rows */}
        <View style={styles.infoCard}>
          {infoRows.map(row => (
            <View key={row.label} style={styles.infoRow}>
              <Ionicons name={row.icon} size={18} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>{row.label}</Text>
                <Text style={styles.infoValue}>{row.value}</Text>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutCard} onPress={logout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: colors.primary },
  headerTitle: { fontSize: typography.xl, fontFamily: typography.fontBold, color: colors.white },
  logoutBtn: { padding: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)' },
  scroll: { flex: 1, backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  content: { padding: 20, paddingBottom: 48 },
  heroCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 28, alignItems: 'center', marginBottom: 16, elevation: 3 },
  avatarWrap: { width: 84, height: 84, borderRadius: 24, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  avatarText: { fontSize: 38, fontFamily: typography.fontBold, color: colors.primary },
  heroName: { fontSize: typography.xxl, fontFamily: typography.fontBold, color: colors.text },
  heroRole: { fontSize: typography.sm, fontFamily: typography.fontRegular, color: colors.textMuted, marginTop: 4 },
  entityPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primaryLight, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginTop: 10 },
  entityPillText: { fontSize: typography.sm, fontFamily: typography.fontMedium, color: colors.primary },
  infoCard: { backgroundColor: colors.surface, borderRadius: 14, overflow: 'hidden', elevation: 2, marginBottom: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  infoLabel: { fontSize: typography.xs, fontFamily: typography.fontRegular, color: colors.textMuted },
  infoValue: { fontSize: typography.base, fontFamily: typography.fontSemiBold, color: colors.text, marginTop: 2 },
  logoutCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: colors.dangerLight, borderRadius: 14, padding: 16, elevation: 1 },
  logoutText: { fontSize: typography.base, fontFamily: typography.fontSemiBold, color: colors.danger },
});
