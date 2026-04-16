import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, StatusBar, Image,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import SearchBar from '../../components/SearchBar';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { auditAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const actionColors = {
  CREATE: colors.success,
  UPDATE: colors.info,
  DELETE: colors.danger,
  LOGIN: colors.primary,
  LOGOUT: colors.textMuted,
  APPROVE: colors.success,
  REJECT: colors.danger,
};

export default function AuditLogScreen() {
  const { logout } = useAuth();
  const [logs, setLogs] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await auditAPI.getLogs({ limit: 100 });
      const data = res.data.logs ?? res.data ?? [];
      setLogs(data);
      setFiltered(data);
    } catch (err) {
      console.warn(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(logs.filter(l =>
      l.action?.toLowerCase().includes(q) ||
      l.user?.name?.toLowerCase().includes(q)
    ));
  }, [search, logs]);

  const onRefresh = () => { setRefreshing(true); fetchLogs(); };

  const renderItem = ({ item }) => {
    const color = actionColors[item.action] || colors.textMuted;
    return (
      <View style={styles.logCard}>
        <View style={[styles.actionDot, { backgroundColor: color }]} />
        <View style={{ flex: 1 }}>
          <View style={styles.logTop}>
            <View style={[styles.actionPill, { backgroundColor: color + '20' }]}>
              <Text style={[styles.actionText, { color }]}>{item.action || 'ACTION'}</Text>
            </View>
            <Text style={styles.logTime}>{new Date(item.timestamp || item.createdAt).toLocaleString()}</Text>
          </View>
          <Text style={styles.logDesc}>{`Action: ${item.action}`}</Text>
          {item.user?.name && (
            <View style={styles.logUser}>
              <Ionicons name="person-outline" size={12} color={colors.textMuted} />
              <Text style={styles.logUserText}>{item.user.name}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={require('../../assets/logo.png')} style={styles.headerLogo} resizeMode="contain" />
          <View>
            <Text style={styles.headerTitle}>Audit Log</Text>
            <Text style={styles.headerSub}>{logs.length} entries</Text>
          </View>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color={colors.white} />
        </TouchableOpacity>
      </View>
      <View style={styles.body}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search logs..." style={{ marginBottom: 16 }} />
        <FlatList
          data={filtered}
          keyExtractor={(item, i) => item.id?.toString() || i.toString()}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={<EmptyState icon="document-text-outline" title="No logs found" />}
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
  logoutBtn: { padding: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)' },
  headerSub: { fontSize: typography.sm, fontFamily: typography.fontRegular, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  body: { flex: 1, backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  logCard: { flexDirection: 'row', gap: 12, backgroundColor: colors.surface, borderRadius: 12, padding: 14, elevation: 1 },
  actionDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  logTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  actionPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  actionText: { fontSize: 10, fontFamily: typography.fontBold, letterSpacing: 0.5 },
  logTime: { fontSize: 10, fontFamily: typography.fontRegular, color: colors.textMuted },
  logDesc: { fontSize: typography.sm, fontFamily: typography.fontRegular, color: colors.text, lineHeight: 20 },
  logUser: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  logUserText: { fontSize: typography.xs, fontFamily: typography.fontRegular, color: colors.textMuted },
});
