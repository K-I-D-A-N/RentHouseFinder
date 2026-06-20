import React from "react";
import { View, Text, StyleSheet } from "react-native";
import useTheme from "../../hooks/useTheme";

export default function SubscriptionStatusScreen({ plan, limits, accountStatus }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Subscription status</Text>
      <View style={styles.infoCard}>
        <Text style={styles.label}>Current plan</Text>
        <Text style={styles.value}>{plan?.name || "No plan selected"}</Text>
      </View>
      <View style={styles.infoCard}>
        <Text style={styles.label}>Account status</Text>
        <Text style={styles.value}>{accountStatus || "Unknown"}</Text>
      </View>
      <View style={styles.infoCard}>
        <Text style={styles.label}>Limits</Text>
        <Text style={styles.value}>Posts: {limits?.posts ?? 0}</Text>
        <Text style={styles.value}>Approvals: {limits?.approvals ?? 0}</Text>
      </View>
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      backgroundColor: colors.background,
    },
    header: {
      fontSize: 24,
      fontWeight: "800",
      color: colors.text,
      marginBottom: 18,
    },
    infoCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 18,
      marginBottom: 14,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 10,
      elevation: 3,
    },
    label: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.textSecondary,
      marginBottom: 8,
    },
    value: {
      fontSize: 16,
      color: colors.text,
      lineHeight: 22,
    },
  });
