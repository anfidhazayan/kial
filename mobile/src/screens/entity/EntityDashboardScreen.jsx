import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import StatsCard from '../../components/StatsCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import { dashboardAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function EntityDashboardScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await dashboardAPI.getEntityStats();
      setStats(res.data);
    } catch (err) {
      console.warn('Entity dashboard fetch failed:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  const onRefresh = () => { setRefreshing(true); fetchStats(); };

  if (loading) return <LoadingSpinner message="Loading dashboard..." />;
  const s = stats || {};

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.name || 'Entity Head'}</Text>
          {user?.entity?.name && <Text style={styles.entityName}>{user.entity.name}</Text>}
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.statsRow}>
          <StatsCard label="Total Staff" value={s.totalStaff} icon="people-outline" color="#6366F1" />
          <StatsCard label="Certificates" value={s.totalCertificates} icon="ribbon-outline" color={colors.primary} />
        </View>
        <View style={styles.statsRow}>
          <StatsCard label="Valid" value={s.validCertificates} icon="checkmark-circle-outline" color={colors.success} />
          <StatsCard label="Expiring Soon" value={s.expiringSoon} icon="alert-circle-outline" color={colors.warning} />
        </View>

        {/* Compliance */}
        <View style={styles.compCard}>
          <View style={styles.compRow}>
            <Text style={styles.compTitle}>Entity Compliance</Text>
            <Text style={[styles.compPercent, { color: (s.complianceRate ?? 0) >= 80 ? colors.success : colors.warning }]}>
              {s.complianceRate ?? 0}%
            </Text>
          </View>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, {
              width: `${s.complianceRate ?? 0}%`,
              backgroundColor: (s.complianceRate ?? 0) >= 80 ? colors.success : colors.warning,
            }]} />
          </View>
        </View>

        {/* Quick Navigate */}
        <Text style={styles.sectionTitle}>Quick Access</Text>
        <View style={styles.quickRow}>
          <TouchableOpacity style={styles.quickCard} onPress={() => navigation.navigate('Staff')} activeOpacity={0.8}>
            <Ionicons name="people-outline" size={28} color={colors.primary} />
            <Text style={styles.quickLabel}>My Staff</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickCard} onPress={() => navigation.navigate('Certificates')} activeOpacity={0.8}>
            <Ionicons name="ribbon-outline" size={28} color="#6366F1" />
            <Text style={styles.quickLabel}>Certificates</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: colors.primary },
  greeting: { fontSize: typography.sm, fontFamily: typography.fontRegular, color: 'rgba(255,255,255,0.7)' },
  userName: { fontSize: typography.lg, fontFamily: typography.fontBold, color: colors.white },
  entityName: { fontSize: typography.sm, fontFamily: typography.fontMedium, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  logoutBtn: { padding: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)' },
  scroll: { flex: 1, backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  content: { padding: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: typography.base, fontFamily: typography.fontSemiBold, color: colors.text, marginBottom: 12, marginTop: 8 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  compCard: { backgroundColor: colors.surface, borderRadius: 14, padding: 18, marginBottom: 24, elevation: 2 },
  compRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  compTitle: { fontSize: typography.base, fontFamily: typography.fontSemiBold, color: colors.text },
  compPercent: { fontSize: typography.xl, fontFamily: typography.fontBold },
  progressBg: { height: 10, backgroundColor: colors.border, borderRadius: 5, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 5 },
  quickRow: { flexDirection: 'row', gap: 12 },
  quickCard: { flex: 1, backgroundColor: colors.surface, borderRadius: 16, padding: 20, alignItems: 'center', gap: 10, elevation: 2 },
  quickLabel: { fontSize: typography.sm, fontFamily: typography.fontMedium, color: colors.text },
});
