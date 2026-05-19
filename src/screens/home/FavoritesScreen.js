import React, { useMemo, useState, useEffect } from "react";
import { View, Text, FlatList, Image, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import useTheme from "../../hooks/useTheme";
import { getProperties } from "../../api/propertyApi";

export default function FavoritesScreen({ navigation }) {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const normalizeList = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.items)) return data.items;
    if (Array.isArray(data.results)) return data.results;
    return [];
  };

  const loadFavorites = async () => {
    setLoading(true);
    try {
      const response = await getProperties({ favorite: true });
      const fetched = normalizeList(response.data);
      if (fetched.length) {
        setFavorites(fetched);
      } else {
        const fallbackResponse = await getProperties();
        setFavorites(normalizeList(fallbackResponse.data));
      }
    } catch (error) {
      console.error("Failed to load favorite properties", error);
      try {
        const fallbackResponse = await getProperties();
        setFavorites(normalizeList(fallbackResponse.data));
      } catch (fallbackError) {
        console.error("Fallback load failed", fallbackError);
        setFavorites([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  const renderItem = ({ item }) => {
    const imageUrl = item.image || item.cover_image || item.images?.[0] || "https://via.placeholder.com/900x600?text=Property";
    const price = item.price || item.rent || 0;
    const location = item.location || item.city || item.address || "Unknown location";
    const bedrooms = item.bedrooms || item.bedroom_count || item.beds || 0;
    const bathrooms = item.bathrooms || item.bathroom_count || 0;
    const area = item.area || item.size || item.square_meters || 0;

    return (
      <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("PropertyDetail", { id: item.id || item._id })}>
        <Image source={{ uri: imageUrl }} style={styles.image} />
        <View style={styles.cardBody}>
          <View style={styles.cardHeader}>
            <Text style={styles.price}>ETB {price.toLocaleString()}/month</Text>
          </View>
          <Text style={styles.location}>{location}</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="bed-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.statText}>{bedrooms}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="water-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.statText}>{bathrooms}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="square-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.statText}>{area} m²</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Favorites</Text>
        <Text style={styles.subtitle}>{favorites.length} saved properties</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading favorites...</Text>
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item, index) => String(item.id || item._id || item.pk || index)}
          contentContainerStyle={styles.list}
          renderItem={renderItem}
          ListEmptyComponent={<Text style={styles.emptyText}>No saved properties yet.</Text>}
        />
      )}
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 24,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 18,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: colors.text,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textSecondary,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
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
  image: {
    width: "100%",
    height: 180,
  },
  cardBody: {
    padding: 18,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  price: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(231, 76, 60, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  location: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 18,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statText: {
    marginLeft: 6,
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: "700",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 40,
  },
  loadingText: {
    marginTop: 14,
    color: colors.textSecondary,
    fontSize: 16,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 40,
    color: colors.textSecondary,
    fontSize: 16,
  },
});
