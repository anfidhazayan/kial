import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, StatusBar, Alert, ActivityIndicator, Image,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import CertificateBadge from '../../components/CertificateBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { certificatesAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function ApprovalsScreen() {
  const { logout } = useAuth();
  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [pendRes, histRes] = await Promise.all([
        certificatesAPI.getAll({ status: 'PENDING' }),
        certificatesAPI.getAll({ status: 'APPROVED,REJECTED' }),
      ]);
      setPending(pendRes.data.certificates ?? pendRes.data ?? []);
      setHistory(histRes.data.certificates ?? histRes.data ?? []);
    } catch (err) {
      console.warn(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const handleApprove = async (id) => {
    setProcessingId(id);
    try {
      await certificatesAPI.approve(id);
      fetchData();
    } catch (err) {
      Alert.alert('Error', 'Could not approve. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = (id) => {
    Alert.prompt(
      'Reject Certificate',
      'Enter reason for rejection:',
      async (reason) => {
        if (!reason?.trim()) return;
        setProcessingId(id);
        try {
          await certificatesAPI.reject(id, reason);
          fetchData();
        } catch {
          Alert.alert('Error', 'Could not reject. Please try again.');
        } finally {
          setProcessingId(null);
        }
      },
      'plain-text'
    );
  };

  const renderPendingItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.certName}>{item.certificateType?.name || 'Certificate'}</Text>
          <Text style={styles.staffName}>{item.staff?.name || 'Unknown staff'}</Text>
          <Text style={styles.entityName}>{item.staff?.entity?.name || ''}</Text>
        </View>
        <CertificateBadge status={item.status} small />
      </View>
      <View style={styles.cardDivider} />
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.rejectBtn}
          onPress={() => handleReject(item.id)}
          disabled={processingId === item.id}
          activeOpacity={0.8}
        >
          <Text style={styles.rejectText}>Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.approveBtn}
          onPress={() => handleApprove(item.id)}
          disabled={processingId === item.id}
          activeOpacity={0.8}
        >
          {processingId === item.id ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.approveText}>Approve</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderHistoryItem = ({ item }) => (
    <View style={styles.histCard}>
      <View style={{ flex: 1 }}>
        <Text style={styles.certName}>{item.certificateType?.name || 'Certificate'}</Text>
        <Text style={styles.staffName}>{item.staff?.name || 'Unknown'}</Text>
        <Text style={styles.dateText}>{new Date(item.updatedAt || item.createdAt).toLocaleDateString()}</Text>
      </View>
      <CertificateBadge status={item.status} small />
    </View>
  );

  if (loading) return <LoadingSpinner />;
  const data = activeTab === 'pending' ? pending : history;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Image source={require('../../assets/logo.png')} style={styles.headerLogo} resizeMode="contain" />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={styles.headerTitle}>Approvals</Text>
            {pending.length > 0 && (
              <View style={styles.badge}><Text style={styles.badgeText}>{pending.length}</Text></View>
            )}
          </View>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color={colors.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        {['pending', 'history'].map(tab => (
          <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.activeTab]} onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab === 'pending' ? `Pending (${pending.length})` : `History (${history.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        style={styles.list}
        data={data}
        keyExtractor={item => item.id?.toString()}
        renderItem={activeTab === 'pending' ? renderPendingItem : renderHistoryItem}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={<EmptyState icon="checkmark-circle-outline" title={activeTab === 'pending' ? 'No pending approvals' : 'No history'} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: colors.primary },
  headerLogo: { width: 32, height: 32 },
  headerTitle: { fontSize: typography.xl, fontFamily: typography.fontBold, color: colors.white },
  logoutBtn: { padding: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)' },
  badge: { backgroundColor: colors.white, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: typography.xs, fontFamily: typography.fontBold, color: colors.primary },
  tabs: { flexDirection: 'row', backgroundColor: colors.primary, paddingHorizontal: 20, gap: 8, paddingBottom: 4 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
  activeTab: { backgroundColor: colors.white },
  tabText: { fontSize: typography.sm, fontFamily: typography.fontMedium, color: 'rgba(255,255,255,0.8)' },
  activeTabText: { color: colors.primary },
  list: { flex: 1, backgroundColor: colors.background, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  card: { backgroundColor: colors.surface, borderRadius: 14, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', padding: 16, gap: 12 },
  certName: { fontSize: typography.base, fontFamily: typography.fontSemiBold, color: colors.text },
  staffName: { fontSize: typography.sm, fontFamily: typography.fontRegular, color: colors.textSecondary, marginTop: 3 },
  entityName: { fontSize: typography.xs, fontFamily: typography.fontRegular, color: colors.primary, marginTop: 2 },
  cardDivider: { height: 1, backgroundColor: colors.border },
  cardActions: { flexDirection: 'row', padding: 12, gap: 10 },
  rejectBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: colors.danger },
  rejectText: { fontSize: typography.sm, fontFamily: typography.fontSemiBold, color: colors.danger },
  approveBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, backgroundColor: colors.success },
  approveText: { fontSize: typography.sm, fontFamily: typography.fontSemiBold, color: colors.white },
  histCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: colors.surface, borderRadius: 12, padding: 14, elevation: 1 },
  dateText: { fontSize: typography.xs, fontFamily: typography.fontRegular, color: colors.textMuted, marginTop: 4 },
});
