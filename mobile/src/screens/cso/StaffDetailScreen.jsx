import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, StatusBar, Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import CertificateBadge from '../../components/CertificateBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { staffAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function StaffDetailScreen({ route, navigation }) {
  const { logout } = useAuth();
  const { staffId } = route.params;
  const [staffMember, setStaffMember] = useState(null);
  const [certificates, setCertificates] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [staffRes, certRes] = await Promise.all([
        staffAPI.getById(staffId),
        staffAPI.getCertificates(staffId),
      ]);
      setStaffMember(staffRes.data.data ?? staffRes.data.staff ?? staffRes.data);
      setCertificates(certRes.data.data ?? certRes.data.certificates ?? certRes.data ?? []);
    } catch (err) {
      console.warn(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [staffId]);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const copyPassword = async (password) => {
    if (!password || password === '\u2014') return;
    await Clipboard.setStringAsync(password);
    Alert.alert('Copied', 'Password has been copied to clipboard.');
  };

  if (loading) return <LoadingSpinner />;
  const s = staffMember || {};
  const name = s.fullName || s.name || 'Unknown';

  const validCerts = certificates.filter(c => c.status === 'VALID' || c.status === 'APPROVED').length;
  const expiredCerts = certificates.filter(c => c.status === 'EXPIRED').length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Dashboard</Text>
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
        {/* Sub-Header area */}
        <View style={styles.pageHeaderArea}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pageTitle}>{name}</Text>
            <View style={styles.pageSubRow}>
              <View style={styles.contractPill}>
                <Text style={styles.contractPillText}>{s.isKialStaff ? 'INTERNAL STAFF' : 'CONTRACT STAFF'}</Text>
              </View>
              <Text style={styles.pageSubText}>
                {s.designation || 'Staff'}  ID: {s.empCode || s.staffId || 'N/A'}
              </Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.editBtn} 
            onPress={() => Alert.alert('Edit Details', 'Open edit form')}
          >
            <Ionicons name="pencil-outline" size={16} color={colors.white} />
            <Text style={styles.editBtnText}>Edit Details</Text>
          </TouchableOpacity>
        </View>

        {/* Metrics Row */}
        <View style={styles.metricsWrapper}>
          <View style={styles.metricCard}>
            <View style={[styles.metricIconBg, { backgroundColor: '#f0fdf4' }]}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#22c55e" />
            </View>
            <Text style={[styles.metricValue, { color: '#16a34a' }]}>{validCerts}</Text>
            <Text style={styles.metricLabel}>VALID CERTS</Text>
          </View>
          <View style={styles.metricCard}>
            <View style={[styles.metricIconBg, { backgroundColor: '#fef9c3' }]}>
              <Ionicons name="calendar-outline" size={16} color="#eab308" />
            </View>
            {/* Dummy value for expiring soon */}
            <Text style={[styles.metricValue, { color: '#ca8a04' }]}>0</Text>
            <Text style={styles.metricLabel}>EXPIRING SOON</Text>
          </View>
          <View style={styles.metricCard}>
            <View style={[styles.metricIconBg, { backgroundColor: '#fef2f2' }]}>
              <Ionicons name="warning-outline" size={16} color="#ef4444" />
            </View>
            <Text style={[styles.metricValue, { color: '#ef4444' }]}>{expiredCerts}</Text>
            <Text style={styles.metricLabel}>EXPIRED</Text>
          </View>
          <View style={[styles.metricCard, styles.metricCardDanger]}>
            <View style={[styles.metricIconBg, { backgroundColor: '#fef2f2' }]}>
              <Ionicons name="document-text-outline" size={16} color="#ef4444" />
            </View>
            <Text style={[styles.metricValue, { color: '#ef4444' }]}>{certificates.length}</Text>
            <Text style={[styles.metricLabel, { color: '#ef4444' }]}>TOTAL CERTS</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsWrapper}>
          <View style={styles.tabsContainer}>
            {['overview', 'certificates'].map(tab => {
              const label = tab === 'overview' ? 'Overview' : 'Certificates';
              return (
                <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.activeTab]} onPress={() => setActiveTab(tab)}>
                  <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Overview Tab ── */}
        {activeTab === 'overview' && (
          <View style={{ gap: 16 }}>
             {/* Dual Card Layout */}
             <View style={styles.dualCardRow}>
                {/* Personal Information */}
                <View style={[styles.sectionCard, { flex: 1 }]}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="person-outline" size={18} color={colors.primary} />
                    <Text style={styles.sectionTitle}>Personal Information</Text>
                  </View>
                  
                  <View style={styles.gridContainer}>
                    <View style={styles.gridItem}>
                      <Text style={styles.gridLabel}>FULL NAME</Text>
                      <Text style={styles.gridValue}>{name}</Text>
                    </View>
                    <View style={styles.gridItem}>
                      <Text style={styles.gridLabel}>AADHAAR NUMBER</Text>
                      <Text style={styles.gridValue}>{s.aadhaarNumber || 'N/A'}</Text>
                    </View>
                    <View style={styles.gridRow}>
                      <View style={styles.gridItemHalf}>
                        <Text style={styles.gridLabel}>DESIGNATION</Text>
                        <Text style={styles.gridValue}>{s.designation || 'N/A'}</Text>
                      </View>
                      <View style={styles.gridItemHalf}>
                        <Text style={styles.gridLabel}>DEPARTMENT</Text>
                        <Text style={styles.gridValue}>{s.department || 'N/A'}</Text>
                      </View>
                    </View>
                    <View style={styles.gridRow}>
                      <View style={styles.gridItemHalf}>
                        <Text style={styles.gridLabel}>PHONE NUMBER</Text>
                        <Text style={[styles.gridValue, { fontSize: typography.sm }]}>{s.phoneNumber || 'N/A'}</Text>
                      </View>
                      <View style={styles.gridItemHalf}>
                        <Text style={styles.gridLabel}>EMAIL ADDRESS</Text>
                        <Text style={[styles.gridValue, { fontSize: typography.sm }]}>{s.email || 'N/A'}</Text>
                      </View>
                    </View>
                    <View style={[styles.gridItem, { backgroundColor: '#f0f9ff' }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                         <Ionicons name="business-outline" size={14} color="#3b82f6" />
                         <Text style={[styles.gridLabel, { color: '#3b82f6', marginBottom: 0 }]}>ENTITY</Text>
                      </View>
                      <Text style={[styles.gridValue, { color: '#1e3a8a' }]}>{s.entity?.name || 'Internal Staff'}</Text>
                    </View>

                    <View style={[styles.gridItem, { width: '100%' }]}>
                      <Text style={styles.gridLabel}>GENERATED PASSWORD</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Text style={[styles.gridValue, { color: colors.primary, fontFamily: typography.fontBold }]}>
                          {s.password || '\u2014'}
                        </Text>
                        {s.password && (
                          <TouchableOpacity onPress={() => copyPassword(s.password)} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                            <Ionicons name="copy-outline" size={16} color={colors.primary} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                </View>

                {/* AEP Details */}
                <View style={[styles.sectionCard, { flex: 1 }]}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="card-outline" size={18} color="#059669" />
                    <Text style={styles.sectionTitle}>AEP Details</Text>
                  </View>
                  
                  <View style={styles.gridContainer}>
                    <View style={[styles.gridItem, { backgroundColor: '#f0fdf4' }]}>
                      <Text style={[styles.gridLabel, { color: '#059669' }]}>AEP NUMBER</Text>
                      <Text style={[styles.gridValue, { color: '#064e3b' }]}>{s.aepNumber || 'N/A'}</Text>
                    </View>
                    <View style={styles.gridItem}>
                      <Text style={styles.gridLabel}>VALID UNTIL</Text>
                      <Text style={styles.gridValue}>
                         <Ionicons name="calendar-outline" size={14} color={colors.textMuted}/> N/A
                      </Text>
                    </View>
                    <View style={styles.gridItem}>
                      <Text style={styles.gridLabel}>AUTHORIZED TERMINALS</Text>
                      <Text style={styles.gridValue}>{s.terminals || 'N/A'}</Text>
                    </View>
                    <View style={styles.gridItem}>
                      <Text style={styles.gridLabel}>EMPLOYEE CODE</Text>
                      <Text style={styles.gridValue}>{s.empCode || s.staffId || 'N/A'}</Text>
                    </View>
                  </View>
                </View>
             </View>
          </View>
        )}

        {/* ── Certificates Tab ── */}
        {activeTab === 'certificates' && (
          <View>
            <View style={styles.tabSectionHeader}>
              <Text style={styles.tabSectionTitle}>Staff Certificates</Text>
              <TouchableOpacity 
                style={styles.darkButton}
                onPress={() => Alert.alert('Coming Soon', 'Add Certificate feature is under development.')}
              >
                <Ionicons name="add" size={18} color={colors.white} />
                <Text style={styles.darkButtonText}>Add Certificate</Text>
              </TouchableOpacity>
            </View>

            {certificates.length === 0 && (
              <EmptyState icon="ribbon-outline" title="No certificates" subtitle="No certificates added yet" />
            )}
            
            {certificates.map(cert => (
              <View key={cert.id} style={styles.docCard}>
                <View style={styles.docIconWrapper}>
                   <Ionicons name="document-text" size={24} color="#60a5fa" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.docName}>{cert.type || cert.name || 'Certificate'}</Text>
                  <Text style={styles.docSub}>
                    <Ionicons name="calendar-outline" size={12} /> {cert.validFrom ? new Date(cert.validFrom).toLocaleDateString() : 'N/A'} - {cert.validTo ? new Date(cert.validTo).toLocaleDateString() : 'N/A'}
                  </Text>
                </View>
                {cert.status === 'EXPIRED' && (
                  <View style={styles.expiredBadge}>
                     <Text style={styles.expiredText}>EXPIRED</Text>
                  </View>
                )}
                {cert.status !== 'EXPIRED' && (
                  <CertificateBadge status={cert.status} small />
                )}
                <View style={styles.docActions}>
                  <Ionicons name="document-outline" size={18} color={colors.textMuted} style={{marginHorizontal: 4}} />
                  <Ionicons name="pencil-outline" size={18} color={colors.textMuted} style={{marginHorizontal: 4}} />
                  <Ionicons name="trash-outline" size={18} color={colors.textMuted} style={{marginHorizontal: 4}} />
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: colors.primary },
  backBtn: { padding: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)' },
  headerTitle: { fontSize: typography.lg, fontFamily: typography.fontBold, color: colors.white },
  logoutBtn: { padding: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)' },
  scroll: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  pageHeaderArea: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, paddingTop: 10, paddingBottom: 20 },
  pageTitle: { fontSize: typography['2xl'] || 24, fontFamily: typography.fontBold, color: '#0f172a' },
  pageSubRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  contractPill: { backgroundColor: '#e2e8f0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  contractPillText: { fontSize: 10, fontFamily: typography.fontBold, color: '#475569' },
  pageSubText: { fontSize: typography.sm, fontFamily: typography.fontMedium, color: colors.textMuted },
  editBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 30, gap: 6 },
  editBtnText: { color: colors.white, fontSize: typography.sm, fontFamily: typography.fontSemiBold },
  metricsWrapper: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  metricCard: { flex: 1, minWidth: '45%', backgroundColor: colors.surface, borderRadius: 16, padding: 16, alignItems: 'center', elevation: 2, borderWidth: 1, borderColor: colors.border },
  metricCardDanger: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  metricIconBg: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  metricValue: { fontSize: 24, fontFamily: typography.fontBold, color: colors.text, marginBottom: 4 },
  metricLabel: { fontSize: 10, fontFamily: typography.fontBold, color: colors.textMuted, textTransform: 'uppercase' },
  tabsWrapper: { marginBottom: 16 },
  tabsContainer: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 24, padding: 4, borderWidth: 1, borderColor: colors.border, alignSelf: 'flex-start' },
  tab: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
  activeTab: { backgroundColor: '#0f172a' },
  tabText: { fontSize: typography.sm, fontFamily: typography.fontMedium, color: colors.textSecondary },
  activeTabText: { color: colors.white },
  dualCardRow: { flexDirection: 'column', gap: 16 }, // On mobile, we stack them vertically instead of side-by-side row
  sectionCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, elevation: 2, borderWidth: 1, borderColor: colors.border },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  sectionTitle: { fontSize: typography.base, fontFamily: typography.fontBold, color: colors.text },
  gridContainer: { gap: 12 },
  gridRow: { flexDirection: 'row', gap: 12 },
  gridItem: { backgroundColor: colors.background, padding: 14, borderRadius: 12 },
  gridItemHalf: { backgroundColor: colors.background, padding: 14, borderRadius: 12, flex: 1 },
  gridLabel: { fontSize: 10, fontFamily: typography.fontBold, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 6 },
  gridValue: { fontSize: typography.base, fontFamily: typography.fontBold, color: colors.text },
  tabSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  tabSectionTitle: { fontSize: typography.lg, fontFamily: typography.fontBold, color: colors.text },
  darkButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, gap: 4 },
  darkButtonText: { color: colors.white, fontSize: typography.sm, fontFamily: typography.fontSemiBold },
  docCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  docIconWrapper: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  docName: { fontSize: typography.base, fontFamily: typography.fontBold, color: colors.text, marginBottom: 4 },
  docSub: { fontSize: typography.xs, fontFamily: typography.fontMedium, color: colors.textSecondary },
  docActions: { flexDirection: 'row', alignItems: 'center', marginLeft: 10 },
  expiredBadge: { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 10 },
  expiredText: { fontSize: 10, fontFamily: typography.fontBold, color: '#ea580c' },
});
