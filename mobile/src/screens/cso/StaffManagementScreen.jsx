import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, StatusBar, Alert, Image,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import SearchBar from '../../components/SearchBar';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { adminAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function StaffManagementScreen({ navigation }) {
  const { logout } = useAuth();
  const [staff, setStaff] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStaff = useCallback(async () => {
    try {
      const res = await adminAPI.getAllStaff();
      const rawData = res.data.data ?? res.data.staff ?? res.data;
      const data = Array.isArray(rawData) ? rawData : [];
      setStaff(data);
      setFiltered(data);
    } catch (err) {
      console.warn(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchStaff();
    });
    return unsubscribe;
  }, [navigation, fetchStaff]);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(staff.filter(s =>
      s.fullName?.toLowerCase().includes(q) ||
      s.name?.toLowerCase().includes(q) ||
      s.empCode?.toLowerCase().includes(q) ||
      s.staffId?.toLowerCase().includes(q) ||
      s.designation?.toLowerCase().includes(q)
    ));
  }, [search, staff]);

  const onRefresh = () => { setRefreshing(true); fetchStaff(); };

  const copyPassword = async (password) => {
    if (!password || password === '\u2014') return;
    await Clipboard.setStringAsync(password);
    Alert.alert('Copied', 'Password has been copied to clipboard.');
  };

  const handleDeleteStaff = (item) => {
    Alert.alert(
      'Remove Staff',
      `Are you sure you want to remove ${(item.fullName || item.name)}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: async () => {
            try {
              await adminAPI.deleteStaff(item.id);
              fetchStaff();
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to remove staff');
            }
          }
        },
      ]
    );
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('StaffDetail', { staffId: item.id })}
      activeOpacity={0.85}
    >
      <View style={styles.cardTop}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{(item.fullName || item.name)?.[0]?.toUpperCase() || '?'}</Text>
        </View>
        <View style={styles.cardHeaderInfo}>
          <Text style={styles.name} numberOfLines={1}>{item.fullName || item.name}</Text>
          <Text style={styles.sub} numberOfLines={1}>
             {item.user?.email || item.email || 'No email provided'}
          </Text>
        </View>
        <View style={styles.idTag}>
          <Text style={styles.idText}>{item.empCode || item.staffId || 'N/A'}</Text>
        </View>
      </View>

      <View style={styles.cardDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="briefcase-outline" size={14} color={colors.textMuted} />
          <Text style={styles.detailText} numberOfLines={1}>
            <Text style={styles.detailLabel}>Role: </Text>
            {item.designation || 'Staff'} {item.department ? `(${item.department})` : ''}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="business-outline" size={14} color={colors.textMuted} />
          <Text style={styles.detailText} numberOfLines={1}>
            <Text style={styles.detailLabel}>Entity: </Text>
            {item.isKialStaff ? 'KIAL Internal Staff' : (item.entity?.name || 'Unassigned')}
          </Text>
        </View>
        
        {/* Access & Zones Block */}
        <View style={styles.zonesBlock}>
          <Text style={styles.detailLabel}>Access Boundaries:</Text>
          <View style={styles.zonesList}>
            {item.aepNumber && (
              <View style={styles.aepPill}>
                <Text style={styles.aepText}>{item.aepNumber}</Text>
              </View>
            )}
            {item.zones?.map((z, idx) => (
              <View key={idx} style={styles.zonePillSmall}>
                <Text style={styles.zoneTextSmall}>{z}</Text>
              </View>
            ))}
            {(!item.aepNumber && (!item.zones || item.zones.length === 0)) && (
              <Text style={{ fontSize: typography.xs, color: colors.textMuted, fontStyle: 'italic' }}>No zones assigned</Text>
             )}
          </View>
        </View>

        <View style={[styles.detailRow, { marginTop: 6 }]}>
          <Ionicons name="key-outline" size={14} color={colors.textMuted} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
            <Text style={styles.detailLabel}>Password: </Text>
            <Text style={{ fontSize: typography.sm, fontFamily: typography.fontBold, color: colors.primary }}>{item.password || '\u2014'}</Text>
            {item.password && (
              <TouchableOpacity 
                onPress={() => copyPassword(item.password)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="copy-outline" size={16} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

      </View>

      <View style={styles.cardActions}>
        <View style={{ flex: 1 }} />
        <TouchableOpacity 
          onPress={() => handleDeleteStaff(item)}
          style={styles.deleteBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="trash-outline" size={18} color={colors.danger} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={require('../../assets/logo.png')} style={styles.headerLogo} resizeMode="contain" />
          <View>
            <Text style={styles.headerTitle}>Staff</Text>
            <Text style={styles.headerSub}>{staff.length} members</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.exportBtn} 
            onPress={() => Alert.alert('Export Excel', 'Generating Excel report...')}
            activeOpacity={0.8}
          >
            <Ionicons name="download-outline" size={20} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddStaff')} activeOpacity={0.8}>
            <Ionicons name="add" size={22} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={22} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.body}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search name, ID, designation..." style={{ marginBottom: 16 }} />
        <FlatList
          data={filtered}
          keyExtractor={item => item.id?.toString()}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={<EmptyState icon="people-outline" title="No staff found" />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: colors.primary },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerLogo: { width: 32, height: 32 },
  headerTitle: { fontSize: typography.xl, fontFamily: typography.fontBold, color: colors.white },
  headerSub: { fontSize: typography.sm, fontFamily: typography.fontRegular, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  addBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  exportBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center' },
  logoutBtn: { padding: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)' },
  body: { flex: 1, backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  card: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatarCircle: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { fontSize: typography.md, fontFamily: typography.fontBold, color: colors.primary },
  cardHeaderInfo: { flex: 1 },
  name: { fontSize: typography.base, fontFamily: typography.fontSemiBold, color: colors.text },
  sub: { fontSize: typography.xs, fontFamily: typography.fontRegular, color: colors.textMuted, marginTop: 2 },
  cardDetails: { backgroundColor: colors.background, padding: 12, borderRadius: 10, gap: 6, marginBottom: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { fontSize: typography.xs, fontFamily: typography.fontRegular, color: colors.text, flex: 1 },
  detailLabel: { fontFamily: typography.fontMedium, color: colors.textSecondary },
  zonesBlock: { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: colors.border },
  zonesList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  aepPill: { backgroundColor: '#e0f2fe', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  aepText: { fontSize: 10, fontFamily: typography.fontBold, color: '#0369a1' },
  zonePillSmall: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0' },
  zoneTextSmall: { fontSize: 10, fontFamily: typography.fontBold, color: '#475569' },
  cardActions: { flexDirection: 'row', alignItems: 'center' },
  idTag: { backgroundColor: colors.surfaceAlt, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  idText: { fontSize: typography.xs, fontFamily: typography.fontMedium, color: colors.textSecondary },
  deleteBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.danger + '10', alignItems: 'center', justifyContent: 'center' },
});
