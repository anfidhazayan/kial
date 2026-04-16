import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, StatusBar, Image, Alert
} from 'react-native';
import * as Clipboard from 'expo-clipboard';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import CertificateBadge from '../../components/CertificateBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { entitiesAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function EntityDetailScreen({ route, navigation }) {
  const { logout } = useAuth();
  const { entityId, entityName } = route.params;
  const [entity, setEntity] = useState(null);
  const [staff, setStaff] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [entityRes, staffRes, certRes] = await Promise.all([
        entitiesAPI.getById(entityId),
        entitiesAPI.getStaff(entityId),
        entitiesAPI.getCertificates(entityId),
      ]);
      setEntity(entityRes.data.data ?? entityRes.data.entity ?? entityRes.data);
      setStaff(staffRes.data.data ?? staffRes.data.staff ?? staffRes.data ?? []);
      setCertificates(certRes.data.data ?? certRes.data.certificates ?? certRes.data ?? []);
    } catch (err) {
      console.warn(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [entityId]);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const copyPassword = async (password) => {
    if (!password || password === '\u2014') return;
    await Clipboard.setStringAsync(password);
    Alert.alert('Copied', 'Password has been copied to clipboard.');
  };

  if (loading) return <LoadingSpinner />;

  const e = entity || {};

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.white} />
          </TouchableOpacity>
          <Image source={require('../../assets/logo.png')} style={{ width: 32, height: 32 }} resizeMode="contain" />
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>{entityName || e.name}</Text>
            <Text style={styles.headerCode}>{e.code || 'N/A'}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* Metrics Row */}
      <View style={styles.metricsWrapper}>
        <View style={styles.metricCard}>
          <View style={[styles.metricIconBg, { backgroundColor: '#eff6ff' }]}>
            <Ionicons name="people-outline" size={16} color="#3b82f6" />
          </View>
          <Text style={styles.metricValue}>{staff.length}</Text>
          <Text style={styles.metricLabel}>TOTAL STAFF</Text>
        </View>
        <View style={styles.metricCard}>
          <View style={[styles.metricIconBg, { backgroundColor: '#eff6ff' }]}>
            <Ionicons name="shield-outline" size={16} color="#3b82f6" />
          </View>
          <Text style={styles.metricValue}>{certificates.length}</Text>
          <Text style={styles.metricLabel}>ENTITY CERTS</Text>
        </View>
        <View style={styles.metricCard}>
          <View style={[styles.metricIconBg, { backgroundColor: '#f0fdf4' }]}>
            <Ionicons name="document-text-outline" size={16} color="#22c55e" />
          </View>
          <Text style={styles.metricValue}>
             {staff.reduce((acc, s) => acc + (s.certificates?.length || 0), 0)}
          </Text>
          <Text style={styles.metricLabel}>STAFF CERTS</Text>
        </View>
        <View style={[styles.metricCard, styles.metricCardDanger]}>
          <View style={[styles.metricIconBg, { backgroundColor: '#fef2f2' }]}>
            <Ionicons name="warning-outline" size={16} color="#ef4444" />
          </View>
          <Text style={[styles.metricValue, { color: '#ef4444' }]}>
             {/* Simple dummy count or actual expired count if available */}
             {certificates.filter(c => c.status === 'EXPIRED').length + staff.reduce((acc, s) => acc + (s.certificates?.filter(c => c.status === 'EXPIRED')?.length || 0), 0) || 0}
          </Text>
          <Text style={[styles.metricLabel, { color: '#ef4444' }]}>ATTENTION NEEDED</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsWrapper}>
        <View style={styles.tabsContainer}>
          {['overview', 'entityCerts', 'staffCerts'].map(tab => {
            const label = tab === 'overview' ? 'Overview' : tab === 'entityCerts' ? 'Entity Certificates' : 'Staff & Certificates';
            return (
              <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.activeTab]} onPress={() => setActiveTab(tab)}>
                <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Overview Tab ── */}
        {activeTab === 'overview' && (
          <View style={{ gap: 16 }}>
            {/* Entity Information Card ... keeping exactly what was made earlier */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="business-outline" size={20} color={colors.primary} />
                <Text style={styles.sectionTitle}>Entity Information</Text>
              </View>
              
              <View style={styles.gridContainer}>
                <View style={[styles.gridItem, { width: '100%' }]}>
                  <Text style={styles.gridLabel}>CLEARANCE STATUS</Text>
                  <View style={[styles.badgeContainer, { backgroundColor: e.securityClearanceStatus === 'ACTIVE' ? '#e2f5e9' : colors.surface }]}>
                    <Text style={[styles.badgeText, { color: e.securityClearanceStatus === 'ACTIVE' ? '#16a34a' : colors.textMuted }]}>
                      {e.securityClearanceStatus || 'N/A'}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.gridRow}>
                  <View style={styles.gridItemHalf}>
                    <Text style={styles.gridLabel}>PROGRAM STATUS</Text>
                    <Text style={styles.gridValue}>{e.securityProgramStatus || 'N/A'}</Text>
                  </View>
                  <View style={styles.gridItemHalf}>
                    <Text style={styles.gridLabel}>QCP STATUS</Text>
                    <Text style={styles.gridValue}>{e.qcpStatus || 'N/A'}</Text>
                  </View>
                </View>
                
                <View style={[styles.gridItem, { width: '100%' }]}>
                  <Text style={styles.gridLabel}>CONTRACT PERIOD</Text>
                  <Text style={[styles.gridValue, { fontSize: typography.sm, fontFamily: typography.fontMedium }]}>
                    <Ionicons name="calendar-outline" size={14} color={colors.textMuted} /> {e.contractValidFrom ? new Date(e.contractValidFrom).toLocaleDateString() : 'N/A'}  to  {e.contractValidTo ? new Date(e.contractValidTo).toLocaleDateString() : 'N/A'}
                  </Text>
                </View>

                <View style={[styles.gridItem, { width: '100%' }]}>
                  <Text style={styles.gridLabel}>GENERATED PASSWORD</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={[styles.gridValue, { color: colors.primary, fontFamily: typography.fontBold }]}>
                      {e.password || '\u2014'}
                    </Text>
                    {e.password && (
                      <TouchableOpacity onPress={() => copyPassword(e.password)} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                        <Ionicons name="copy-outline" size={16} color={colors.primary} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            </View>

            {/* Contact Details Card */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="call-outline" size={20} color={colors.primary} />
                <Text style={styles.sectionTitle}>Contact Details</Text>
              </View>
              
              <View style={styles.contactBlock}>
                <Text style={styles.contactRole}>ASCO (SECURITY OFFICER)</Text>
                <View style={styles.contactItem}>
                   <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
                   <Text style={styles.contactText}>{e.ascoName || 'N/A'}</Text>
                </View>
                <View style={styles.contactItem}>
                   <Ionicons name="call-outline" size={16} color={colors.textSecondary} />
                   <Text style={styles.contactText}>{e.ascoContactNo || 'N/A'}</Text>
                </View>
                <View style={styles.contactItem}>
                   <Ionicons name="mail-outline" size={16} color={colors.textSecondary} />
                   <Text style={styles.contactText}>{e.ascoEmail || 'N/A'}</Text>
                </View>
              </View>

              <View style={[styles.contactBlock, styles.kialBlock]}>
                <Text style={[styles.contactRole, { color: colors.primary }]}>KIAL POINT OF CONTACT</Text>
                <View style={styles.contactItem}>
                   <Ionicons name="person-outline" size={16} color={colors.primary} />
                   <Text style={[styles.contactText, { color: colors.primary }]}>{e.kialPocName || 'N/A'}</Text>
                </View>
                <View style={styles.contactItem}>
                   <Ionicons name="call-outline" size={16} color={colors.primary} />
                   <Text style={[styles.contactText, { color: colors.primary }]}>{e.kialPocNumber || 'N/A'}</Text>
                </View>
                <View style={styles.contactItem}>
                   <Ionicons name="mail-outline" size={16} color={colors.primary} />
                   <Text style={[styles.contactText, { color: colors.primary }]}>{e.kialPocEmail || 'N/A'}</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ── Entity Certificates Tab ── */}
        {activeTab === 'entityCerts' && (
          <View>
            <View style={styles.tabSectionHeader}>
              <Text style={styles.tabSectionTitle}>Entity Certificates</Text>
              <TouchableOpacity 
                style={styles.darkButton}
                onPress={() => Alert.alert('Coming Soon', 'Add Certificate feature is under development.')}
              >
                <Ionicons name="add" size={18} color={colors.white} />
                <Text style={styles.darkButtonText}>Add Certificate</Text>
              </TouchableOpacity>
            </View>

            {certificates.length === 0 && (
              <EmptyState icon="document-text-outline" title="No certificates" subtitle="No entity certificates added yet" />
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

        {/* ── Staff & Certificates Tab ── */}
        {activeTab === 'staffCerts' && (
          <View>
            <View style={styles.tabSectionHeader}>
              <Text style={styles.tabSectionTitle}>Entity Staff Members</Text>
              <TouchableOpacity 
                style={styles.darkButton}
                onPress={() => navigation.navigate('AddStaff', { entityId: e.id, entityName: e.name })}
              >
                <Ionicons name="add" size={18} color={colors.white} />
                <Text style={styles.darkButtonText}>Add Staff</Text>
              </TouchableOpacity>
            </View>

            {staff.length === 0 && (
              <EmptyState icon="people-outline" title="No staff found" subtitle="No staff assigned to this entity yet" />
            )}
            
            {staff.map(s => {
              const expiredCerts = s.certificates?.filter(c => c.status === 'EXPIRED') || [];
              return (
                <View key={s.id} style={styles.docCard}>
                  <View style={[styles.docIconWrapper, { backgroundColor: '#eff6ff', borderRadius: 8 }]}>
                    <Text style={{ fontSize: typography.base, fontFamily: typography.fontBold, color: '#3b82f6' }}>
                      {s.fullName?.[0]?.toUpperCase() || '?'}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docName}>{s.fullName || s.name}</Text>
                    <Text style={styles.docSub}>
                      <Text style={{ color: '#3b82f6', fontFamily: typography.fontMedium }}>{s.designation || 'Staff'}</Text>
                      {'  '}ID: {s.empCode || s.staffId || 'N/A'}
                    </Text>
                  </View>
                  {expiredCerts.length > 0 && (
                    <Text style={{ color: '#ef4444', fontSize: typography.xs, fontFamily: typography.fontSemiBold, marginRight: 10 }}>
                      {expiredCerts.length} expired
                    </Text>
                  )}
                  <View style={styles.docActions}>
                    <Ionicons name="eye-outline" size={18} color={colors.textMuted} style={{marginHorizontal: 8}} />
                    <Ionicons name="trash-outline" size={18} color={colors.textMuted} style={{marginHorizontal: 4}} />
                  </View>
                </View>
              );
            })}
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
  headerCode: { fontSize: typography.xs, fontFamily: typography.fontRegular, color: 'rgba(255,255,255,0.7)' },
  metricsWrapper: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 20, paddingVertical: 16, backgroundColor: colors.primary },
  metricCard: { flex: 1, minWidth: '40%', backgroundColor: colors.white, borderRadius: 16, padding: 16, alignItems: 'center', elevation: 2 },
  metricCardDanger: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' },
  metricIconBg: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  metricValue: { fontSize: 24, fontFamily: typography.fontBold, color: colors.text, marginBottom: 4 },
  metricLabel: { fontSize: 10, fontFamily: typography.fontBold, color: colors.textMuted, textTransform: 'uppercase' },
  tabsWrapper: { paddingHorizontal: 20, paddingBottom: 16, backgroundColor: colors.primary, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  tabsContainer: { flexDirection: 'row', backgroundColor: colors.white, borderRadius: 24, padding: 4 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 20 },
  activeTab: { backgroundColor: '#0f172a' },
  tabText: { fontSize: 12, fontFamily: typography.fontMedium, color: colors.textSecondary },
  activeTabText: { color: colors.white },
  scroll: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  sectionCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  sectionTitle: { fontSize: typography.base, fontFamily: typography.fontBold, color: colors.text },
  gridContainer: { gap: 12 },
  gridRow: { flexDirection: 'row', gap: 12 },
  gridItem: { backgroundColor: colors.background, padding: 14, borderRadius: 12 },
  gridItemHalf: { backgroundColor: colors.background, padding: 14, borderRadius: 12, flex: 1 },
  gridLabel: { fontSize: 10, fontFamily: typography.fontBold, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 6 },
  gridValue: { fontSize: typography.base, fontFamily: typography.fontBold, color: colors.text },
  badgeContainer: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: typography.xs, fontFamily: typography.fontBold },
  contactBlock: { marginBottom: 16 },
  contactRole: { fontSize: 10, fontFamily: typography.fontBold, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 8 },
  contactItem: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  contactText: { fontSize: typography.sm, fontFamily: typography.fontMedium, color: colors.textSecondary },
  kialBlock: { backgroundColor: colors.primaryLight + '50', padding: 14, borderRadius: 12, marginBottom: 0 },
  tabSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  tabSectionTitle: { fontSize: typography.lg, fontFamily: typography.fontBold, color: colors.text },
  darkButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, gap: 4 },
  darkButtonText: { color: colors.white, fontSize: typography.sm, fontFamily: typography.fontSemiBold },
  docCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  docIconWrapper: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#f0f9ff', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  docName: { fontSize: typography.base, fontFamily: typography.fontBold, color: colors.text, marginBottom: 4 },
  docSub: { fontSize: typography.xs, fontFamily: typography.fontMedium, color: colors.textSecondary },
  docActions: { flexDirection: 'row', alignItems: 'center', marginLeft: 10 },
  expiredBadge: { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 10 },
  expiredText: { fontSize: 10, fontFamily: typography.fontBold, color: '#ea580c' },
});
