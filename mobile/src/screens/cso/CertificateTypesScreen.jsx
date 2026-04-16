import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, StatusBar, Alert, TextInput, Modal, ActivityIndicator, Image,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { certTypesAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function CertificateTypesScreen() {
  const { logout } = useAuth();
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeDesc, setNewTypeDesc] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchTypes = useCallback(async () => {
    try {
      const res = await certTypesAPI.getAll();
      setTypes(res.data.certificateTypes ?? res.data ?? []);
    } catch (err) {
      console.warn(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchTypes(); }, [fetchTypes]);
  const onRefresh = () => { setRefreshing(true); fetchTypes(); };

  const handleAdd = async () => {
    if (!newTypeName.trim()) return;
    setSaving(true);
    try {
      await certTypesAPI.create({ name: newTypeName.trim(), description: newTypeDesc.trim() });
      setModalVisible(false);
      setNewTypeName('');
      setNewTypeDesc('');
      fetchTypes();
    } catch (err) {
      Alert.alert('Error', 'Could not create certificate type.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id, name) => {
    Alert.alert('Delete Type', `Delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await certTypesAPI.delete(id);
            fetchTypes();
          } catch {
            Alert.alert('Error', 'Could not delete.');
          }
        },
      },
    ]);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={require('../../assets/logo.png')} style={styles.headerLogo} resizeMode="contain" />
          <View>
            <Text style={styles.headerTitle}>Certificate Types</Text>
            <Text style={styles.headerSub}>{types.length} types defined</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
            <Ionicons name="add" size={22} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={22} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        style={styles.list}
        data={types}
        keyExtractor={item => item.id?.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardIcon}>
              <Ionicons name="ribbon-outline" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.typeName}>{item.name}</Text>
              {item.description && <Text style={styles.typeDesc}>{item.description}</Text>}
              <Text style={styles.typeCount}>{item._count?.certificates ?? 0} certificates</Text>
            </View>
            <TouchableOpacity onPress={() => handleDelete(item.id, item.name)} style={styles.deleteBtn}>
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </TouchableOpacity>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={<EmptyState icon="ribbon-outline" title="No certificate types" subtitle="Add one using the + button" />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      />

      {/* Add Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Certificate Type</Text>
            <TextInput
              style={styles.modalInput}
              value={newTypeName}
              onChangeText={setNewTypeName}
              placeholder="e.g. AVSEC Basic Training"
              placeholderTextColor={colors.textMuted}
              autoFocus
            />
            <TextInput
              style={[styles.modalInput, { height: 80 }]}
              value={newTypeDesc}
              onChangeText={setNewTypeDesc}
              placeholder="Description (optional)"
              placeholderTextColor={colors.textMuted}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAdd} disabled={saving}>
                {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveText}>Add</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  logoutBtn: { padding: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)' },
  list: { flex: 1, backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 14, padding: 16, elevation: 2 },
  cardIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  typeName: { fontSize: typography.base, fontFamily: typography.fontSemiBold, color: colors.text },
  typeDesc: { fontSize: typography.xs, fontFamily: typography.fontRegular, color: colors.textMuted, marginTop: 2 },
  typeCount: { fontSize: typography.xs, fontFamily: typography.fontMedium, color: colors.primary, marginTop: 4 },
  deleteBtn: { padding: 8 },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, gap: 14 },
  modalTitle: { fontSize: typography.lg, fontFamily: typography.fontBold, color: colors.text, marginBottom: 4 },
  modalInput: { backgroundColor: colors.background, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: typography.base, fontFamily: typography.fontRegular, color: colors.text },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border },
  cancelText: { fontSize: typography.base, fontFamily: typography.fontSemiBold, color: colors.textSecondary },
  saveBtn: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 12, backgroundColor: colors.primary },
  saveText: { fontSize: typography.base, fontFamily: typography.fontSemiBold, color: colors.white },
});
