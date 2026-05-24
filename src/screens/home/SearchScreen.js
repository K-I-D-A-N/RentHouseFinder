import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Image, ActivityIndicator } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import useTheme from "../../hooks/useTheme";
import { getProperties } from "../../api/propertyApi";
import { getCategories } from "../../api/categoryApi";
import { getPrimaryImageUrl } from "../../utils/dataHelpers";
import ImageWithFallback from "../../components/ImageWithFallback";

const defaultPropertyTypes = [{ name: "All Types", slug: "All Types" }];

export default function SearchScreen({ navigation }) {
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [location, setLocation] = useState("");
  const [selectedType, setSelectedType] = useState("All Types");
  const [propertyTypes, setPropertyTypes] = useState(defaultPropertyTypes);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const normalizeList = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.items)) return data.items;
    if (Array.isArray(data.results)) return data.results;
    return [];
  };

  const debounceRef = useRef(null);
  const lastQueryKey = useRef(null);

  const loadProperties = async (params = {}) => {
    setLoading(true);
    try {
      const key = JSON.stringify(params || {});
      if (lastQueryKey.current === key) {
        setLoading(false);
        return;
      }
      lastQueryKey.current = key;
      console.log("Selected property type:", selectedType);
      const response = await getProperties(params);
      console.log("Fetched search listings:", response.data);
      setProperties(normalizeList(response.data));
    } catch (error) {
      console.error("Failed to load properties", error);
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProperties();
  }, []);

  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const response = await getCategories();
        const data = Array.isArray(response.data) ? response.data : [];
        setPropertyTypes([
          { name: "All Types", slug: "All Types" },
          ...data.map((category) => ({
            name: category.name || category.title || "Unknown",
            slug: category.slug || String(category.name || category.title || "").toLowerCase().replace(/\s+/g, "-"),
          })),
        ]);
      } catch (error) {
        console.warn("Failed to fetch property types", error);
      }
    };
    fetchTypes();
  }, []);

  // When filters change, debounce and fetch from backend using supported query params
  useEffect(() => {
    const params = {};
    if (location?.trim()) {
      params.city = location.trim();
      // also use as general search keyword for partial matches
      params.search = location.trim();
    }
    if (selectedType && selectedType !== "All Types") params.category = selectedType;
    if (minPrice) params.min_price = minPrice;
    if (maxPrice) params.max_price = maxPrice;

    // clear stale results while loading
    setProperties([]);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      loadProperties(params);
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [location, selectedType, minPrice, maxPrice]);

  const filteredProperties = useMemo(() => properties, [properties]);

  const makeImageUri = (image) => {
    if (!image) return "";
    if (typeof image === "string") return image;
    if (typeof image === "object") return image.uri || image.url || image.path || "";
    return String(image);
  };

  const renderPropertyCard = ({ item }) => {
    const imageUrl = getPrimaryImageUrl(item) || "";
    const price = item.price || item.rent || 0;
    const itemLocation = item.location || item.city || item.address || "Unknown";
    const beds = item.bedrooms || item.bedroom_count || item.beds || 0;

    return (
      <TouchableOpacity style={styles.resultCard} onPress={() => navigation.navigate("HomeTab", { screen: "PropertyDetailScreen", params: { id: item.id, slug: item.slug } })}>
        <ImageWithFallback sourceUri={imageUrl} style={styles.resultImage} />
        <View style={styles.resultBody}>
          <Text style={styles.resultPrice}>ETB {price.toLocaleString()}/month</Text>
          <Text style={styles.resultLocation}>{itemLocation}</Text>
          <Text style={styles.resultTitle} numberOfLines={1}>{item.title || item.name || "Property"}</Text>
          <Text style={styles.resultBeds}>{beds} bed{beds !== 1 ? "s" : ""}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const ListHeader = () => (
    <View>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Search & Filter</Text>
          <Text style={styles.subtitle}>Find the best rental with filters.</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <Icon name="close" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionLabel}>Price Range</Text>
        <View style={styles.priceInputRow}>
          <View style={styles.priceInput}>
            <Text style={styles.priceInputLabel}>Min Price</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor={colors.placeholder}
              keyboardType="numeric"
              value={minPrice}
              onChangeText={setMinPrice}
            />
            <Text style={styles.priceInputUnit}>ETB</Text>
          </View>
          <View style={styles.priceInput}>
            <Text style={styles.priceInputLabel}>Max Price</Text>
            <TextInput
              style={styles.input}
              placeholder="5000000"
              placeholderTextColor={colors.placeholder}
              keyboardType="numeric"
              value={maxPrice}
              onChangeText={setMaxPrice}
            />
            <Text style={styles.priceInputUnit}>ETB</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Location</Text>
        <View style={styles.searchBox}>
          <Icon name="location-on" size={20} color={colors.placeholder} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Enter location"
            placeholderTextColor={colors.placeholder}
            value={location}
            onChangeText={setLocation}
          />
        </View>

        <Text style={styles.sectionLabel}>Property Type</Text>
        <View style={styles.typesRow}>
          {propertyTypes.map((type) => (
            <TouchableOpacity
              key={type.slug}
              style={[styles.typeButton, selectedType === type.slug && styles.typeButtonActive]}
              onPress={() => setSelectedType(type.slug)}
            >
              <Text style={[styles.typeText, selectedType === type.slug && styles.typeTextActive]}>{type.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Bedrooms filter removed per request */}

        <Text style={styles.resultsLabel}>{filteredProperties.length} Properties Found</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      <FlatList
        data={filteredProperties}
        keyExtractor={(item) => String(item.id || item._id || Math.random())}
        renderItem={renderPropertyCard}
        contentContainerStyle={[styles.listContent, { paddingBottom: 140 }]}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={<Text style={styles.emptyText}>No properties found matching your filters.</Text>}
      />
    </View>
  );
}


const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    maxWidth: 260,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.shadow,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionLabel: {
    marginTop: 16,
    marginBottom: 12,
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  resultsLabel: {
    marginTop: 24,
    marginBottom: 12,
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  priceInputRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  priceInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    borderWidth: 1,
    borderColor: colors.muted,
  },
  priceInputLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 6,
    fontWeight: "600",
  },
  input: {
    fontSize: 16,
    color: colors.text,
    padding: 0,
  },
  priceInputUnit: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 6,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.muted,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    padding: 0,
  },
  typesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  typeButton: {
    width: "48%",
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.muted,
  },
  typeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  typeTextActive: {
    color: colors.surface,
  },
  bedroomsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  bedroomCard: {
    width: "18%",
    minWidth: 60,
    minHeight: 60,
    backgroundColor: colors.surface,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.muted,
  },
  bedroomCardActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  bedroomText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  bedroomTextActive: {
    color: colors.surface,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 14,
    flexDirection: "row",
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  resultImage: {
    width: 110,
    height: 110,
  },
  resultBody: {
    flex: 1,
    padding: 12,
    justifyContent: "space-between",
  },
  resultPrice: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
  },
  resultLocation: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  resultBeds: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 20,
    color: colors.textSecondary,
    fontSize: 16,
  },
});
