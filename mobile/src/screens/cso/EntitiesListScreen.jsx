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

export default function EntitiesListScreen({ navigation }) {
  const { logout } = useAuth();
  const [entities, setEntities] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchEntities = useCallback(async () => {
    try {
      const res = await adminAPI.getAllEntities();
      const rawData = res.data.data ?? res.data.entities ?? res.data;
      const data = Array.isArray(rawData) ? rawData : [];
      setEntities(data);
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
      fetchEntities();
    });
    return unsubscribe;
  }, [navigation, fetchEntities]);

  useEffect(() => { fetchEntities(); }, [fetchEntities]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(entities.filter(e =>
      e.name?.toLowerCase().includes(q) || e.code?.toLowerCase().includes(q)
    ));
  }, [search, entities]);

  const copyPassword = async (password) => {
    if (!password || password === '\u2014') return;
    await Clipboard.setStringAsync(password);
    Alert.alert('Copied', 'Password has been copied to clipboard.');
  };

  const handleDeleteEntity = (item) => {
    Alert.alert(
      'Remove Entity',
      `Are you sure you want to remove "${item.name}"? This will also remove all associated staff members and certificates.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove All', 
          style: 'destructive',
          onPress: async () => {
            try {
              await adminAPI.deleteEntity(item.id);
              fetchEntities();
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to remove entity');
            }
          }
        },
      ]
    );
  };

  const onRefresh = () => { setRefreshing(true); fetchEntities(); };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('EntityDetail', { entityId: item.id, entityName: item.name })}
      activeOpacity={0.85}
    >
      <View style={styles.cardTop}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{item.name?.[0]?.toUpperCase() || 'E'}</Text>
        </View>
        <View style={styles.cardHeaderInfo}>
          <Text style={styles.entityName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.entityCode}>{item.category || item.externalEntityCode || 'General Entity'}</Text>
        </View>
        <View style={styles.staffBadge}>
          <Text style={styles.staffCount}>{item._count?.staffMembers ?? item.staffCount ?? 0}</Text>
          <Text style={styles.staffLabel}>Staff</Text>
        </View>
      </View>
      
      <View style={styles.cardDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="person-outline" size={14} color={colors.textMuted} />
          <Text style={styles.detailText} numberOfLines={1}>
            <Text style={styles.detailLabel}>ASCO: </Text>
            {item.ascoName || 'N/A'} {item.ascoContactNo ? `(${item.ascoContactNo})` : ''}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="business-outline" size={14} color={colors.textMuted} />
          <Text style={styles.detailText} numberOfLines={1}>
            <Text style={styles.detailLabel}>KIAL POC: </Text>
            {item.kialPocName || 'N/A'} {item.kialPocNumber ? `(${item.kialPocNumber})` : ''}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="key-outline" size={14} color={colors.textMuted} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
            <Text style={styles.detailLabel}>Password: </Text>
            <Text style={styles.passwordText}>{item.password || '\u2014'}</Text>
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
        <View style={styles.statusBadge}>
           <Text style={styles.statusText}>SC: {item.securityClearanceStatus || 'N/A'}</Text>
        </View>
        <View style={[styles.statusBadge, { marginLeft: 8 }]}>
           <Text style={styles.statusText}>SP: {item.securityProgramStatus || 'N/A'}</Text>
        </View>
        <View style={{ flex: 1 }} />
        <TouchableOpacity 
          onPress={() => handleDeleteEntity(item)}
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
            <Text style={styles.headerTitle}>Entities</Text>
            <Text style={styles.headerSub}>{entities.length} registered</Text>
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
          <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddEntity')} activeOpacity={0.8}>
            <Ionicons name="add" size={22} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={22} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.body}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search entities..." style={{ marginBottom: 16 }} />
        <FlatList
          data={filtered}
          keyExtractor={item => item.id?.toString()}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={<EmptyState icon="business-outline" title="No entities found" subtitle="Try a different search term" />}
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
  exportBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center' },
  addBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  logoutBtn: { padding: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)' },
  body: { flex: 1, backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  card: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatarCircle: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { fontSize: typography.md, fontFamily: typography.fontBold, color: colors.primary },
  cardHeaderInfo: { flex: 1 },
  entityName: { fontSize: typography.base, fontFamily: typography.fontSemiBold, color: colors.text },
  entityCode: { fontSize: typography.xs, fontFamily: typography.fontRegular, color: colors.textMuted, marginTop: 2 },
  staffBadge: { alignItems: 'center', paddingLeft: 10 },
  staffCount: { fontSize: typography.lg, fontFamily: typography.fontBold, color: colors.primary },
  staffLabel: { fontSize: typography.xs, fontFamily: typography.fontRegular, color: colors.textMuted },
  cardDetails: { backgroundColor: colors.background, padding: 12, borderRadius: 10, gap: 6, marginBottom: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { fontSize: typography.xs, fontFamily: typography.fontRegular, color: colors.text, flex: 1 },
  detailLabel: { fontFamily: typography.fontMedium, color: colors.textSecondary },
  passwordText: { fontFamily: typography.fontSemiBold, color: colors.primary },
  cardActions: { flexDirection: 'row', alignItems: 'center' },
  statusBadge: { backgroundColor: '#fdf3c7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 10, fontFamily: typography.fontSemiBold, color: '#b46d06', textTransform: 'uppercase' },
  deleteBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.danger + '10', alignItems: 'center', justifyContent: 'center' },
});
