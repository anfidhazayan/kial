import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

export default function EmptyState({ icon = 'folder-open-outline', title = 'Nothing here', subtitle }) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={48} color={colors.border} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 8,
  },
  iconWrap: {
    marginBottom: 8,
  },
  title: {
    fontSize: typography.md,
    fontFamily: typography.fontSemiBold,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.sm,
    fontFamily: typography.fontRegular,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: typography.sm * typography.lineHeightRelaxed,
  },
});
