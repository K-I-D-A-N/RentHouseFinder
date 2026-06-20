import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialIcons as Icon } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import useTheme from "../../hooks/useTheme";
import { getProperties } from "../../api/propertyApi";
import { getPrimaryImageUrl, sortByFeatured } from "../../utils/dataHelpers";
import ImageWithFallback from "../../components/ImageWithFallback";

const FAVORITES_KEY = "betrent_favorite_ids";

async function loadFavoriteIds() {
  try {
    const raw = await AsyncStorage.getItem(FAVORITES_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

async function saveFavoriteIds(ids) {
  try {
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify([...ids]));
  } catch {}
}

export default function FavoritesScreen({ navigation }) {
  const { t } = useTranslation();
  const [allProperties, setAllProperties] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Reload both favorites and all properties every time screen is focused
  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        setLoading(true);
        try {
          const [ids, response] = await Promise.all([
            loadFavoriteIds(),
            getProperties(),
          ]);
          setFavoriteIds(ids);
          const data = response.data;
          const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
          setAllProperties(sortByFeatured(items));
        } catch (error) {
          console.error("Failed to load favorites", error);
        } finally {
          setLoading(false);
        }
      };
      load();
    }, [])
  );

  // Only show properties the user has favorited
  const favorites = useMemo(
    () => allProperties.filter((p) => favoriteIds.has(String(p.id || p._id || p.pk || ""))),
    [allProperties, favoriteIds]
  );

  // Unfavorite directly from this screen — same toggle logic as HomeScreen
  const toggleFavorite = useCallback(async (itemId) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      saveFavoriteIds(next);
      return next;
    });
  }, []);

  const renderItem = ({ item }) => {
    const imageUrl = getPrimaryImageUrl(item) || "";
    const itemId = String(item.id || item._id || item.pk || "");
    const isFavorited = favoriteIds.has(itemId);
    const price = item.price_per_month || item.price_per_week || item.price_per_day || item.price || 0;
    const priceUnit = item.price_per_month ? t("favorites.month") : item.price_per_week ? t("favorites.week") : t("favorites.day");
    const location = item.location || item.city || item.address || t("propertyDetail.locationUnavailable") || "Unknown location";
    const title = item.title || item.name || "";

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={() =>
          navigation.navigate("HomeTab", {
            screen: "PropertyDetailScreen",
            params: { id: item.id || item._id, slug: item.slug },
          })
        }
      >
        <ImageWithFallback sourceUri={imageUrl} style={styles.image} isFeatured={item.is_featured} featuredUntil={item.featured_until} />

        {/* Heart button on the card image — same as HomeScreen */}
        <TouchableOpacity
          style={styles.heartButton}
          onPress={() => toggleFavorite(itemId)}
          activeOpacity={0.75}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon
            name={isFavorited ? "favorite" : "favorite-border"}
            size={20}
            color={isFavorited ? "#f5a623" : "#fff"}
          />
        </TouchableOpacity>

        <View style={styles.cardBody}>
          <View style={styles.cardHeader}>
            <Text style={styles.price}>
              ETB {Number(price).toLocaleString()} / {priceUnit}
            </Text>
          </View>
          {!!title && <Text style={styles.titleText} numberOfLines={1}>{title}</Text>}
          <Text style={styles.location}>{location}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("favorites.title")}</Text>
        <Text style={styles.subtitle}>{t("favorites.subtitle", { count: favorites.length })}</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t("favorites.loading")}</Text>
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item, index) =>
            String(item.id || item._id || item.pk || index)
          }
          contentContainerStyle={styles.list}
          renderItem={renderItem}
          ListEmptyComponent={
            <Text style={styles.emptyText}>{t("favorites.empty")}</Text>
          }
        />
      )}
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingTop: 24 },
    header: { paddingHorizontal: 20, marginBottom: 18 },
    title: { fontSize: 28, fontWeight: "900", color: colors.text },
    subtitle: { marginTop: 8, fontSize: 14, color: colors.textSecondary },
    list: { paddingHorizontal: 20, paddingBottom: 24 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 28,
      overflow: "hidden",
      marginBottom: 18,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.05,
      shadowRadius: 24,
      elevation: 6,
    },
    image: { width: "100%", minHeight: 180, backgroundColor: colors.muted },
    heartButton: {
      position: "absolute",
      top: 14,
      right: 14,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    cardBody: { padding: 18 },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 6,
    },
    price: { fontSize: 20, fontWeight: "800", color: colors.text },
    titleText: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 6 },
    location: { fontSize: 14, color: colors.textSecondary },
    loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 40 },
    loadingText: { marginTop: 14, color: colors.textSecondary, fontSize: 16 },
    emptyText: { textAlign: "center", marginTop: 40, color: colors.textSecondary, fontSize: 16 },
  });