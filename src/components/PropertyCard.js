import React, { useMemo, useRef } from "react";
import { View, Text, Pressable, Animated, StyleSheet } from "react-native";
import { MaterialIcons as Icon } from "@expo/vector-icons";
import useTheme from "../hooks/useTheme";
import { getPrimaryImageUrl } from "../utils/dataHelpers";
import ImageWithFallback from "./ImageWithFallback";

const formatPrice = (value) => {
  if (value == null || value === "") return null;
  const number = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(number)) return String(value);
  return number.toLocaleString();
};

const buildPriceLabel = (property) => {
  if (!property) return "";
  if (property.price_per_day) return `${formatPrice(property.price_per_day)} ETB / day`;
  if (property.price_per_month) return `${formatPrice(property.price_per_month)} ETB / month`;
  if (property.price_per_week) return `${formatPrice(property.price_per_week)} ETB / week`;
  if (property.price) return `${formatPrice(property.price)} ETB`;
  return "Price unavailable";
};

const buildLocation = (property) => {
  if (!property) return "";
  return (
    property.location || property.city || property.address || property.area || property.region || "Unknown location"
  );
};

const buildTitle = (property) => {
  if (!property) return "";
  return property.title || property.name || property.headline || "Untitled property";
};

const buildCategory = (property) => {
  if (!property) return "";
  return (
    property.property_type || property.type || property.category_name || property.category?.name || property.listing_type || ""
  );
};

export default function PropertyCard({ property, onPress, actionLabel, onActionPress }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.98,
      useNativeDriver: true,
      friction: 7,
      tension: 80,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 7,
      tension: 80,
    }).start();
  };

  const imageUrl = getPrimaryImageUrl(property) || "";
  const priceLabel = buildPriceLabel(property);
  const locationText = buildLocation(property);
  const titleText = buildTitle(property);
  const descriptionText = property.description || property.summary || property.details || "";
  const badgeLabel = buildCategory(property);
  const isFeatured = property.is_featured || property.featured;

  return (
    <Animated.View style={[styles.cardWrapper, { transform: [{ scale }] }]}> 
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.cardPressable}
        android_ripple={{ color: colors.primary + "22" }}
      >
        <View style={styles.card}>
          <ImageWithFallback sourceUri={imageUrl} style={styles.propertyImage} />

          <View style={styles.badgeRow}>
            {isFeatured && (
              <View style={styles.featuredBadge}>
                <Text style={styles.featuredBadgeText}>Featured</Text>
              </View>
            )}
            {badgeLabel ? (
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>{badgeLabel}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.cardContent}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.priceText} numberOfLines={1}>{priceLabel}</Text>
            </View>

            <Text style={styles.locationText} numberOfLines={1}>{locationText}</Text>
            <Text style={styles.propertyTitle} numberOfLines={2}>{titleText}</Text>

            {descriptionText ? (
              <Text style={styles.descriptionText} numberOfLines={2}>{descriptionText}</Text>
            ) : null}

            {actionLabel && onActionPress ? (
              <Pressable
                onPress={onActionPress}
                style={({ pressed }) => [
                  styles.actionButton,
                  pressed && styles.actionButtonPressed,
                ]}
              >
                <Icon name="visibility" size={16} color={colors.surface} style={styles.actionIcon} />
                <Text style={styles.actionText}>{actionLabel}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    cardWrapper: {
      marginBottom: 18,
    },
    cardPressable: {
      borderRadius: 24,
      overflow: "hidden",
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 24,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 18,
      elevation: 6,
      overflow: "hidden",
    },
    propertyImage: {
      width: "100%",
      minHeight: 190,
      backgroundColor: colors.muted,
    },
    badgeRow: {
      position: "absolute",
      top: 16,
      left: 16,
      right: 16,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    featuredBadge: {
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
    },
    featuredBadgeText: {
      color: colors.surface,
      fontSize: 12,
      fontWeight: "800",
    },
    typeBadge: {
      backgroundColor: "rgba(255,255,255,0.92)",
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
    },
    typeBadgeText: {
      fontSize: 12,
      color: colors.text,
      fontWeight: "700",
    },
    cardContent: {
      padding: 18,
      paddingTop: 16,
    },
    cardTitleRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10,
    },
    priceText: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.text,
    },
    locationText: {
      color: colors.textSecondary,
      fontSize: 14,
      marginBottom: 8,
    },
    propertyTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: colors.text,
      lineHeight: 26,
      marginBottom: 10,
    },
    descriptionText: {
      color: colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 14,
    },
    actionButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    actionButtonPressed: {
      opacity: 0.85,
    },
    actionText: {
      color: colors.surface,
      fontWeight: "700",
      fontSize: 14,
    },
    actionIcon: {
      marginRight: 8,
    },
  });
