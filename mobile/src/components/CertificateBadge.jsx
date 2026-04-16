import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

const statusConfig = {
  VALID: { label: 'Valid', bg: colors.successLight, text: colors.success },
  PENDING: { label: 'Pending', bg: colors.warningLight, text: colors.warning },
  EXPIRED: { label: 'Expired', bg: colors.dangerLight, text: colors.danger },
  REJECTED: { label: 'Rejected', bg: colors.dangerLight, text: colors.danger },
  APPROVED: { label: 'Approved', bg: colors.successLight, text: colors.success },
};

export default function CertificateBadge({ status, small }) {
  const config = statusConfig[status] || { label: status, bg: colors.surfaceAlt, text: colors.textSecondary };

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }, small && styles.small]}>
      <Text style={[styles.text, { color: config.text }, small && styles.smallText]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: typography.xs,
    fontFamily: typography.fontSemiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  small: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  smallText: {
    fontSize: 10,
  },
});
