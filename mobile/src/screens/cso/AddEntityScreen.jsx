import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, StatusBar, Alert, ActivityIndicator,
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
      autoCapitalize={field === 'ascoEmail' ? 'none' : 'words'}
      autoCorrect={false}
    />
  </View>
);

export default function AddEntityScreen({ navigation }) {
  const { logout } = useAuth();
  const [form, setForm] = useState({
    name: '',
    externalEntityCode: '',
    category: '',
    ascoName: '',
    ascoEmail: '',
    ascoContactNo: '',
  });
  const [loading, setLoading] = useState(false);

  const update = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      Alert.alert('Required Field', 'Entity Name is required.');
      return;
    }
    
    setLoading(true);
    try {
      const response = await adminAPI.createEntity(form);
      const newEntity = response.data?.data || response.data;
      const passwordMsg = newEntity?.password 
        ? `\n\nGenerated Password: ${newEntity.password}\n\nPlease give this password to the entity.` 
        : '';

      Alert.alert('Success', `Entity registered successfully.${passwordMsg}`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to register entity.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Register New Entity</Text>
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
          <Text style={styles.sectionLabel}>Entity Information</Text>
          <Field form={form} update={update} label="Entity Name" field="name" placeholder="e.g. ABC Ground Handling" required />
          <Field form={form} update={update} label="Entity Code (External)" field="externalEntityCode" placeholder="e.g. ABC-GHA" />
          <Field form={form} update={update} label="Category" field="category" placeholder="e.g. GHA, Fuel, Security" />

          <Text style={styles.sectionLabel}>ASCO / Point of Contact</Text>
          <Field form={form} update={update} label="ASCO Name" field="ascoName" placeholder="John Smith" />
          <Field form={form} update={update} label="ASCO Email" field="ascoEmail" placeholder="asco@company.com" keyboardType="email-address" />
          <Field form={form} update={update} label="Contact Number" field="ascoContactNo" placeholder="+91 9876543210" keyboardType="phone-pad" />

          <View style={styles.noteBox}>
            <Ionicons name="information-circle-outline" size={18} color={colors.info} />
            <Text style={styles.noteText}>
              Registering an email for the ASCO will automatically create an 'Entity Head' account for them to manage their own staff.
            </Text>
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
                <Ionicons name="business-outline" size={20} color={colors.white} />
                <Text style={styles.submitBtnText}>Register Entity</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: typography.sm, fontFamily: typography.fontMedium, color: colors.textSecondary, marginBottom: 8 },
  input: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, height: 50, fontSize: typography.base, fontFamily: typography.fontRegular, color: colors.text },
  noteBox: { flexDirection: 'row', gap: 10, backgroundColor: colors.info + '10', padding: 14, borderRadius: 12, marginTop: 10, marginBottom: 10 },
  noteText: { flex: 1, fontSize: typography.xs, fontFamily: typography.fontRegular, color: colors.textSecondary, lineHeight: 18 },
  submitBtn: { backgroundColor: colors.primary, borderRadius: 14, height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 24, elevation: 5, shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  submitBtnText: { fontSize: typography.md, fontFamily: typography.fontSemiBold, color: colors.white },
});
