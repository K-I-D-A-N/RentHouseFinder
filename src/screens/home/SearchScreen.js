import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Image, ActivityIndicator } from "react-native";
import { useTranslation } from "react-i18next";
import Icon from "react-native-vector-icons/MaterialIcons";
import useTheme from "../../hooks/useTheme";
import { getProperties } from "../../api/propertyApi";
import { getCategories } from "../../api/categoryApi";
import { getPrimaryImageUrl, sortByFeatured } from "../../utils/dataHelpers";
import ImageWithFallback from "../../components/ImageWithFallback";

const defaultPropertyTypes = [{ name: "All Types", value: "All Types" }];

export default function SearchScreen({ navigation }) {
  const { t } = useTranslation();
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

  const loadProperties = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      setProperties([]);
      console.log("loadProperties called with params:", params);
      const response = await getProperties(params);
      const list = normalizeList(response.data);
      console.log("Fetched properties count:", list.length, "Sample:", list[0]);
      setProperties(sortByFeatured(list));
    } catch (error) {
      console.error("Failed to load properties", error);
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const response = await getCategories();
        const data = Array.isArray(response.data) ? response.data : [];
        setPropertyTypes([
          { name: "All Types", value: "All Types" },
          ...data.map((category) => ({
            name: category.name || category.title || t("common.unknown"),
            value: category.name || category.title || t("common.unknown"), // Use actual category name for filtering
          })),
        ]);
      } catch (error) {
        console.warn("Failed to fetch property types", error);
      }
    };
    fetchTypes();
  }, []);

  // When filters change, debounce and fetch from backend
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    
    debounceRef.current = setTimeout(() => {
      const params = {};
      
      // Only location is sent to backend for search
      if (location?.trim()) {
        params.search = location.trim();
      }
      
      // Price filters are sent to backend
      if (minPrice) params.min_price = minPrice;
      if (maxPrice) params.max_price = maxPrice;
      
      // Category is NOT sent to backend - it will be filtered client-side
      console.log("Backend params (location & price only):", params);
      console.log("Category filter applied client-side: selectedType=", selectedType);
      
      loadProperties(params);
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [location, selectedType, minPrice, maxPrice, loadProperties]);

  const filteredProperties = useMemo(() => {
    console.log("Filtering with selectedType:", selectedType);
    console.log("Properties available:", properties.length);
    console.log("Sample properties:", properties.slice(0, 3).map(p => ({ 
      title: p.title, 
      category_name: p.category_name,
      category: p.category,
      property_type: p.property_type,
      type: p.type
    })));

    // If "All Types" is selected, return all properties
    if (selectedType === "All Types") {
      console.log("All Types selected, returning all properties");
      return properties;
    }

    // Filter based on category with normalization
    const normalizedSelected = selectedType?.trim().toLowerCase();
    console.log("Normalized selected type:", normalizedSelected);
    
    const filtered = properties.filter((item) => {
      // Check multiple possible category fields
      let categoryValue = null;
      
      // Priority 1: category_name field
      if (item.category_name) {
        categoryValue = String(item.category_name).trim();
      }
      // Priority 2: category object with name
      else if (item.category?.name) {
        categoryValue = String(item.category.name).trim();
      }
      // Priority 3: category string
      else if (typeof item.category === 'string') {
        categoryValue = item.category.trim();
      }
      // Priority 4: property_type
      else if (item.property_type) {
        categoryValue = String(item.property_type).trim();
      }
      // Priority 5: type field
      else if (item.type) {
        categoryValue = String(item.type).trim();
      }
      
      const normalizedCategory = categoryValue?.toLowerCase();
      const isMatch = normalizedCategory === normalizedSelected;
      
      if (!isMatch && item.id) {
        console.log(`Item ${item.id}: category="${normalizedCategory}" vs selected="${normalizedSelected}" - NO MATCH`);
      }
      
      return isMatch;
    });

    console.log("Filtered results count:", filtered.length);
    return filtered;
  }, [properties, selectedType]);

  const makeImageUri = (image) => {
    if (!image) return "";
    if (typeof image === "string") return image;
    if (typeof image === "object") return image.uri || image.url || image.path || "";
    return String(image);
  };

  const renderPropertyCard = ({ item }) => {
    const imageUrl = getPrimaryImageUrl(item) || "";
    const price = item.price_per_month ?? item.price ?? item.rent ?? 0;
    const itemLocation = item.location || item.city || item.address || t("common.unknown");

    return (
      <TouchableOpacity style={styles.resultCard} onPress={() => navigation.navigate("HomeTab", { screen: "PropertyDetailScreen", params: { id: item.id, slug: item.slug } })}>
        <ImageWithFallback sourceUri={imageUrl} style={styles.resultImage} isFeatured={item.is_featured} featuredUntil={item.featured_until} />
        <View style={styles.resultBody}>
          <Text style={styles.resultPrice}>ETB {Number(price).toLocaleString()}/month</Text>
          <Text style={styles.resultLocation}>{itemLocation}</Text>
          <Text style={styles.resultTitle} numberOfLines={1}>{item.title || item.name || t("search.propertyFallback")}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const ListHeader = (
    <View>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>{t("search.title")}</Text>
          <Text style={styles.subtitle}>{t("search.subtitle")}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <Icon name="close" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionLabel}>{t("search.priceRange")}</Text>
        <View style={styles.priceInputRow}>
          <View style={styles.priceInput}>
            <Text style={styles.priceInputLabel}>{t("search.minPrice")}</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor={colors.placeholder}
              keyboardType="numeric"
              value={minPrice}
              onChangeText={(t) => setMinPrice(t)}
            />
            <Text style={styles.priceInputUnit}>ETB</Text>
          </View>
          <View style={styles.priceInput}>
            <Text style={styles.priceInputLabel}>{t("search.maxPrice")}</Text>
            <TextInput
              style={styles.input}
              placeholder="5000000"
              placeholderTextColor={colors.placeholder}
              keyboardType="numeric"
              value={maxPrice}
              onChangeText={(t) => setMaxPrice(t)}
            />
            <Text style={styles.priceInputUnit}>ETB</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>{t("search.location")}</Text>
        <View style={styles.searchBox}>
          <Icon name="location-on" size={20} color={colors.placeholder} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t("search.locationPlaceholder")}
            placeholderTextColor={colors.placeholder}
            value={location}
            onChangeText={(t) => setLocation(t)}
          />
        </View>

        <Text style={styles.sectionLabel}>{t("search.propertyType")}</Text>
        <View style={styles.typesRow}>
          {propertyTypes.map((type) => (
            <TouchableOpacity
              key={type.value}
              style={[styles.typeButton, selectedType === type.value && styles.typeButtonActive]}
              onPress={() => { console.log("Category pressed:", type.value); setSelectedType(type.value); }}
            >
              <Text style={[styles.typeText, selectedType === type.value && styles.typeTextActive]}>{type.value === "All Types" ? t("search.allTypes") : type.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.resultsLabel}>{t("search.propertiesFound", { count: filteredProperties.length })}</Text>
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

      {ListHeader}
      <FlatList
        data={filteredProperties}
        keyExtractor={(item, index) => String(item.id || item._id || item.slug || index)}
        renderItem={renderPropertyCard}
        contentContainerStyle={[styles.listContent, { paddingBottom: 120 }]}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={<Text style={styles.emptyText}>{t("search.noProperties")}</Text>}
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
