import React, { useEffect, useState, useCallback, memo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, StatusBar, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import LoadingSpinner from '../../components/LoadingSpinner';
import { dashboardAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// ─── Moved OUTSIDE component to prevent re-creation on every render ──────────
const radius = 60;
const strokeWidth = 20;
const circumference = 2 * Math.PI * radius;

const ChartSection = memo(({ expired }) => (
  <View style={styles.chartContainer}>
    <Svg width={160} height={160} viewBox="0 0 160 160">
      <Circle cx="80" cy="80" r={radius} stroke={colors.border} strokeWidth={strokeWidth} fill="none" />
      <Circle
        cx="80" cy="80" r={radius}
        stroke={colors.danger} strokeWidth={strokeWidth} fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={0}
        strokeLinecap="round"
      />
    </Svg>
    <Text style={styles.chartCenterText}>{expired}</Text>
  </View>
));
// ─────────────────────────────────────────────────────────────────────────────

export default function SystemOverviewScreen() {
  const { logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('Month');

  const fetchStats = useCallback(async () => {
    try {
      const res = await dashboardAPI.getCSOStats();
      setStats(res.data.data ?? res.data);
    } catch (err) {
      console.warn(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  const onRefresh = () => { setRefreshing(true); fetchStats(); };

  if (loading) return <LoadingSpinner />;

  const s = {
    totalEntities: stats?.totalEntities ?? 1,
    totalStaff: stats?.totalStaff ?? 1,
    totalCertificates: stats?.totalCertificates ?? 2,
    complianceRate: stats?.complianceRate ?? 0,
    compliance: stats?.compliance ?? { expired: 2, valid: 0, expiringSoon: 0 },
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={require('../../assets/logo.png')} style={styles.headerLogo} resizeMode="contain" />
          <Text style={styles.headerTitle}>Overview</Text>
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
        <View style={styles.mainCard}>
          {/* System Overview Header */}
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={styles.cardTitle}>System Overview</Text>
              <Text style={styles.cardSubTitle}>Analytics and insights</Text>
            </View>
            <View style={styles.filterGroup}>
              {['Week', 'Month', 'Year'].map((filter) => (
                <TouchableOpacity
                  key={filter}
                  onPress={() => setActiveFilter(filter)}
                  style={[styles.filterBtn, activeFilter === filter && styles.filterBtnActive]}
                >
                  <Text style={[styles.filterText, activeFilter === filter && styles.filterTextActive]}>{filter}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Metrics Row */}
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <View style={styles.iconBox}><Ionicons name="business" size={18} color={colors.danger} /></View>
              <Text style={styles.metricValue}>{s.totalEntities}</Text>
              <Text style={styles.metricLabel}>Active Entities</Text>
            </View>
            <View style={styles.metricItem}>
              <View style={styles.iconBox}><Ionicons name="person" size={18} color={colors.danger} /></View>
              <Text style={styles.metricValue}>{s.totalStaff}</Text>
              <Text style={styles.metricLabel}>Total Staff</Text>
            </View>
            <View style={styles.metricItem}>
              <View style={styles.iconBox}><Ionicons name="document-text" size={18} color={colors.danger} /></View>
              <Text style={styles.metricValue}>{s.totalCertificates}</Text>
              <Text style={styles.metricLabel}>Certificates</Text>
            </View>
            <View style={styles.metricItem}>
              <View style={styles.iconBox}><Ionicons name="shield-checkmark" size={18} color={colors.danger} /></View>
              <Text style={styles.metricValue}>{s.complianceRate}%</Text>
              <Text style={styles.metricLabel}>Compliance Rate</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Compliance Overview Section */}
          <View style={styles.compHeaderRow}>
            <View>
              <Text style={styles.cardTitle}>Compliance Overview</Text>
              <Text style={styles.cardSubTitle}>Current certificate status breakdown</Text>
            </View>
            <Text style={styles.entitiesLabel}>Entities</Text>
          </View>

          <View style={styles.chartLegendRow}>
            <ChartSection expired={s.compliance?.expired} />
            <View style={styles.legendCol}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
                <Text style={styles.legendText}>Expired</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: colors.primary },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerLogo: { width: 32, height: 32 },
  headerTitle: { fontSize: typography.xl, fontFamily: typography.fontBold, color: colors.white },
  logoutBtn: { padding: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)' },

  scroll: { flex: 1, backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  content: { padding: 16, paddingBottom: 40 },

  mainCard: { backgroundColor: colors.surface, borderRadius: 24, padding: 24, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },

  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 30 },
  cardTitle: { fontSize: 22, fontFamily: typography.fontBold, color: colors.text, marginBottom: 4 },
  cardSubTitle: { fontSize: 12, fontFamily: typography.fontRegular, color: colors.textMuted },

  filterGroup: { flexDirection: 'row', backgroundColor: '#F9FAFB', borderRadius: 12, padding: 4, borderWidth: 1, borderColor: '#F2F4F7' },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  filterBtnActive: { backgroundColor: '#101828' },
  filterText: { fontSize: 11, fontFamily: typography.fontSemiBold, color: '#667085' },
  filterTextActive: { color: colors.white },

  metricsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  metricItem: { alignItems: 'flex-start', flex: 1 },
  iconBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.dangerLight, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  metricValue: { fontSize: 24, fontFamily: typography.fontBold, color: colors.text, marginBottom: 4 },
  metricLabel: { fontSize: 10, fontFamily: typography.fontMedium, color: colors.textSecondary },

  divider: { height: 1, backgroundColor: '#F2F4F7', marginBottom: 30 },

  compHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 },
  entitiesLabel: { fontSize: 18, fontFamily: typography.fontBold, color: colors.text },

  chartLegendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 },
  chartContainer: { position: 'relative', width: 160, height: 160, alignItems: 'center', justifyContent: 'center' },
  chartCenterText: { position: 'absolute', fontSize: 20, fontFamily: typography.fontBold, color: colors.text },

  legendCol: { flex: 1, marginLeft: 40, gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 8, height: 8, borderRadius: 2 },
  legendText: { fontSize: 13, fontFamily: typography.fontSemiBold, color: colors.textSecondary },
});
