import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, StatusBar, Alert, ActivityIndicator, Modal, FlatList, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { adminAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const Field = ({ form, update, label, field, placeholder, keyboardType = 'default', required }) => (
  <View style={styles.fieldGroup}>
    <Text style={styles.label}>{label}{required && <Text style={{ color: colors.danger }}> *</Text>}</Text>
    <TextInput
      style={styles.input}
      value={form[field]}
      onChangeText={val => update(field, val)}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      keyboardType={keyboardType}
      autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
      autoCorrect={false}
    />
  </View>
);

export default function AddStaffScreen({ navigation }) {
  const { logout } = useAuth();
  const [form, setForm] = useState({
    name: '', email: '', phone: '', staffId: '',
    designation: '', nationality: '', passportNumber: '',
    department: '', aadhaarNumber: '', aepNumber: '', terminals: '',
    zones: [],
    isKialStaff: true,
    entityId: null,
  });
  const [entities, setEntities] = useState([]);
  const [selectedEntityName, setSelectedEntityName] = useState('Select Entity');
  const [showEntityModal, setShowEntityModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingEntities, setFetchingEntities] = useState(false);

  useEffect(() => {
    loadEntities();
  }, []);

  const loadEntities = async () => {
    setFetchingEntities(true);
    try {
      const res = await adminAPI.getAllEntities();
      const rawData = res.data.data ?? res.data.entities ?? res.data;
      setEntities(Array.isArray(rawData) ? rawData : []);
    } catch (err) {
      console.warn('Failed to load entities', err);
    } finally {
      setFetchingEntities(false);
    }
  };

  const update = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      Alert.alert('Required Fields', 'Name and Email are required.');
      return;
    }
    
    if (!form.isKialStaff && !form.entityId) {
      Alert.alert('Required Field', 'Please select an entity for external staff.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        fullName: form.name,
        email: form.email,
        phoneNumber: form.phone,
        empCode: form.staffId,
        designation: form.designation,
        nationality: form.nationality,
        passportNumber: form.passportNumber,
        department: form.department,
        aadhaarNumber: form.aadhaarNumber,
        aepNumber: form.aepNumber,
        terminals: form.terminals,
        zones: form.zones,
        isKialStaff: form.isKialStaff,
        entityId: form.entityId,
      };
      await adminAPI.createStaff(payload);
      Alert.alert('Success', 'Staff member added successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to add staff.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const selectEntity = (item) => {
    update('entityId', item.id);
    setSelectedEntityName(item.name);
    setShowEntityModal(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add New Staff</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color={colors.white} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionLabel}>Staff Type</Text>
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleLabel}>KIAL Internal Staff</Text>
              <Text style={styles.toggleSub}>Toggle off for external entities</Text>
            </View>
            <Switch
              value={form.isKialStaff}
              onValueChange={val => update('isKialStaff', val)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>

          {!form.isKialStaff && (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Select Entity <Text style={{ color: colors.danger }}>*</Text></Text>
              <TouchableOpacity 
                style={styles.selector} 
                onPress={() => setShowEntityModal(true)}
                activeOpacity={0.7}
              >
                <Text style={[styles.selectorText, selectedEntityName === 'Select Entity' && { color: colors.textMuted }]}>
                  {selectedEntityName}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.sectionLabel}>Personal Information</Text>
          <Field form={form} update={update} label="Full Name" field="name" placeholder="e.g. John Doe" required />
          <Field form={form} update={update} label="Email" field="email" placeholder="staff@example.com" keyboardType="email-address" required />
          <Field form={form} update={update} label="Phone" field="phone" placeholder="+91 9876543210" keyboardType="phone-pad" />
          <Field form={form} update={update} label="Nationality" field="nationality" placeholder="Indian" />
          <Field form={form} update={update} label="Passport Number" field="passportNumber" placeholder="A1234567" />

          <Text style={styles.sectionLabel}>Employment Details</Text>
          <Field form={form} update={update} label="Staff / Employee Code" field="staffId" placeholder="KIAL-001" />
          <Field form={form} update={update} label="Designation" field="designation" placeholder="e.g. Security Officer" />
          <Field form={form} update={update} label="Department" field="department" placeholder="e.g. Terminal Security" />
          <Field form={form} update={update} label="Aadhaar Number" field="aadhaarNumber" placeholder="XXXX XXXX XXXX" keyboardType="numeric" />
          <Field form={form} update={update} label="AEP Number" field="aepNumber" placeholder="AEP-001" />
          <Field form={form} update={update} label="Terminals" field="terminals" placeholder="e.g. T1, T2" />

          <Text style={styles.sectionLabel}>Areas / Zones</Text>
          <View style={styles.zonesWrapper}>
            {['A', 'D', 'Si', 'Sd', 'P', 'B', 'F', 'Ft', 'C', 'Ci', 'Cd', 'Cs', 'I', 'Os'].map(zone => (
              <TouchableOpacity 
                key={zone}
                onPress={() => {
                  if (form.zones.includes(zone)) {
                    update('zones', form.zones.filter(z => z !== zone));
                  } else {
                    update('zones', [...form.zones, zone]);
                  }
                }}
                style={[styles.zonePill, form.zones.includes(zone) && styles.zonePillActive]}
              >
                <Text style={[styles.zoneText, form.zones.includes(zone) && styles.zoneTextActive]}>{zone}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, loading && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Ionicons name="person-add-outline" size={20} color={colors.white} />
                <Text style={styles.submitBtnText}>Add Staff Member</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showEntityModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Entity</Text>
              <TouchableOpacity onPress={() => setShowEntityModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            {fetchingEntities ? (
              <ActivityIndicator color={colors.primary} style={{ margin: 20 }} />
            ) : (
              <FlatList
                data={entities}
                keyExtractor={item => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.entityItem} 
                    onPress={() => selectEntity(item)}
                  >
                    <Text style={styles.entityItemText}>{item.name}</Text>
                    {form.entityId === item.id && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                  </TouchableOpacity>
                )}
                contentContainerStyle={{ padding: 10 }}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: colors.primary },
  backBtn: { padding: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)' },
  headerTitle: { fontSize: typography.lg, fontFamily: typography.fontBold, color: colors.white },
  logoutBtn: { padding: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)' },
  scroll: { flex: 1, backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  content: { padding: 24, paddingBottom: 48 },
  sectionLabel: { fontSize: typography.sm, fontFamily: typography.fontSemiBold, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginTop: 20, marginBottom: 12 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, padding: 16, borderRadius: 14, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  toggleLabel: { fontSize: typography.base, fontFamily: typography.fontSemiBold, color: colors.text },
  toggleSub: { fontSize: typography.xs, fontFamily: typography.fontRegular, color: colors.textSecondary, marginTop: 2 },
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: typography.sm, fontFamily: typography.fontMedium, color: colors.textSecondary, marginBottom: 8 },
  input: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, height: 50, fontSize: typography.base, fontFamily: typography.fontRegular, color: colors.text },
  selector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, height: 50 },
  selectorText: { fontSize: typography.base, fontFamily: typography.fontRegular, color: colors.text },
  submitBtn: { backgroundColor: colors.primary, borderRadius: 14, height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 24, elevation: 5, shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  submitBtnText: { fontSize: typography.md, fontFamily: typography.fontSemiBold, color: colors.white },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingHorizontal: 5 },
  modalTitle: { fontSize: typography.lg, fontFamily: typography.fontBold, color: colors.text },
  entityItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  entityItemText: { fontSize: typography.base, fontFamily: typography.fontMedium, color: colors.text },
  zonesWrapper: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  zonePill: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  zonePillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  zoneText: { fontSize: typography.sm, fontFamily: typography.fontMedium, color: colors.textSecondary },
  zoneTextActive: { color: colors.white },
});
