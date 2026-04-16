import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import SearchBar from '../../components/SearchBar';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { Ionicons } from '@expo/vector-icons';
import { staffAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function EntityStaffListScreen({ navigation }) {
  const { user } = useAuth();
  const [staff, setStaff] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStaff = useCallback(async () => {
    try {
      const res = await staffAPI.getAll({ entityId: user?.entityId });
      const data = res.data.staff ?? res.data ?? [];
      setStaff(data);
      setFiltered(data);
    } catch (err) {
      console.warn(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.entityId]);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(staff.filter(s =>
      s.name?.toLowerCase().includes(q) || s.designation?.toLowerCase().includes(q)
    ));
  }, [search, staff]);

  const onRefresh = () => { setRefreshing(true); fetchStaff(); };

  if (loading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Staff</Text>
        <Text style={styles.headerSub}>{staff.length} members</Text>
      </View>
      <View style={styles.body}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search staff..." style={{ marginBottom: 16 }} />
        <FlatList
          data={filtered}
          keyExtractor={item => item.id?.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('EntityStaffDetail', { staffId: item.id })}
              activeOpacity={0.85}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.name?.[0]?.toUpperCase() || '?'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.sub}>{item.designation || 'Staff Member'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
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
  header: { paddingHorizontal: 20, paddingVertical: 16, backgroundColor: colors.primary },
  headerTitle: { fontSize: typography.xl, fontFamily: typography.fontBold, color: colors.white },
  headerSub: { fontSize: typography.sm, fontFamily: typography.fontRegular, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  body: { flex: 1, backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 14, padding: 14, elevation: 2 },
  avatar: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: typography.md, fontFamily: typography.fontBold, color: colors.primary },
  name: { fontSize: typography.base, fontFamily: typography.fontSemiBold, color: colors.text },
  sub: { fontSize: typography.xs, fontFamily: typography.fontRegular, color: colors.textMuted, marginTop: 2 },
});
