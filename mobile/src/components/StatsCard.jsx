import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

export default function StatsCard({ label, value, icon, color, subtext }) {
  const accentColor = color || colors.primary;

  return (
    <View style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: accentColor + '1A' }]}>
        <Ionicons name={icon} size={22} color={accentColor} />
      </View>
      <Text style={styles.value}>{value ?? '—'}</Text>
      <Text style={styles.label}>{label}</Text>
      {subtext ? <Text style={styles.subtext}>{subtext}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    alignItems: 'flex-start',
    minWidth: 140,
    flex: 1,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  value: {
    fontSize: typography.xl,
    fontFamily: typography.fontBold,
    color: colors.text,
    lineHeight: typography.xl * typography.lineHeightTight,
  },
  label: {
    fontSize: typography.xs,
    fontFamily: typography.fontMedium,
    color: colors.textMuted,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: typography.trackingWide,
  },
  subtext: {
    fontSize: typography.xs,
    fontFamily: typography.fontRegular,
    color: colors.textSecondary,
    marginTop: 4,
  },
});
