import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import useTheme from "../hooks/useTheme";

export default function PropertyCardSkeleton() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.card}>
      <View style={styles.image} />
      <View style={styles.content}>
        <View style={styles.row}>
          <View style={styles.priceLine} />
          <View style={styles.badgeLine} />
        </View>
        <View style={styles.locationLine} />
        <View style={styles.titleLine} />
        <View style={styles.button} />
      </View>
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 24,
      marginBottom: 18,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 5,
      overflow: "hidden",
    },
    image: {
      width: "100%",
      minHeight: 180,
      backgroundColor: colors.muted,
    },
    content: {
      padding: 18,
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10,
    },
    priceLine: {
      width: "45%",
      height: 20,
      borderRadius: 8,
      backgroundColor: colors.muted,
    },
    badgeLine: {
      width: 72,
      height: 28,
      borderRadius: 999,
      backgroundColor: colors.muted,
    },
    locationLine: {
      width: "60%",
      height: 14,
      borderRadius: 6,
      backgroundColor: colors.muted,
      marginBottom: 8,
    },
    titleLine: {
      width: "85%",
      height: 24,
      borderRadius: 8,
      backgroundColor: colors.muted,
      marginBottom: 14,
    },
    button: {
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.muted,
    },
  });
