import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  TextInput,
  RefreshControl,
  Image,
  ScrollView,
  Pressable,
  Animated,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import Icon from "react-native-vector-icons/MaterialIcons";
import useTheme from "../../hooks/useTheme";
import { getProperties } from "../../api/propertyApi";
import { getCategories } from "../../api/categoryApi";
import { getPrimaryImageUrl } from "../../utils/dataHelpers";
import ImageWithFallback from "../../components/ImageWithFallback";

const defaultCategories = [{ name: "All", slug: "All" }];

export default function HomeScreen({ navigation }) {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [categories, setCategories] = useState(defaultCategories);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const lastTapRef = useRef(0);

  const loadProperties = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      setProperties([]);
      console.log("Selected category:", selectedCategory);
      const response = await getProperties(params);
      console.log("Fetched listings:", response.data);
      const data = response.data;
      const items = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
        ? data.items
        : [];
      setProperties(items);
    } catch (error) {
      console.error("Failed to load properties", error);
      setProperties([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory]);

  // live backend filtering for HomeScreen search
  const debounceRef = React.useRef(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const params = {};
        if (searchQuery?.trim()) params.search = searchQuery.trim();
        if (selectedCategory && selectedCategory !== "All") params.category = selectedCategory;
        await loadProperties(params);
      } catch (err) {
        console.error("Live search failed", err);
      }
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery, loadProperties]);

  useEffect(() => {
    const params = {};
    if (searchQuery?.trim()) params.search = searchQuery.trim();
    if (selectedCategory && selectedCategory !== "All") params.category = selectedCategory;
    setProperties([]);
    loadProperties(params);
  }, [selectedCategory, loadProperties]);

  useEffect(() => {
    loadProperties();
    const fetchCategories = async () => {
      try {
        const response = await getCategories();
        const data = Array.isArray(response.data) ? response.data : [];
        setCategories([{ name: "All", slug: "All" }, ...data.map((category) => ({
          name: category.name || category.title || "Unknown",
          slug: category.slug || String(category.name || category.title || "").toLowerCase().replace(/\s+/g, "-"),
        }))]);
      } catch (err) {
        console.warn("Failed to load home categories", err);
      }
    };
    fetchCategories();
  }, [loadProperties]);

  useFocusEffect(
    useCallback(() => {
      const params = {};
      if (searchQuery?.trim()) params.search = searchQuery.trim();
      if (selectedCategory && selectedCategory !== "All") params.category = selectedCategory;
      loadProperties(params);
    }, [loadProperties, searchQuery, selectedCategory])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadProperties();
  };

  const makeString = (value) => {
    if (value == null) return "";
    if (typeof value === "string" || typeof value === "number") return String(value);
    if (typeof value === "object") return value.name || value.slug || value.description || "";
    return "";
  };

  // Improved image extraction: handle arrays of objects or URLs
  const makeImageUri = (image) => {
    if (!image) return "";
    if (typeof image === "string") return image;
    if (Array.isArray(image) && image.length > 0) {
      // Try url, image, uri, or string
      return image[0]?.url || image[0]?.image || image[0]?.uri || (typeof image[0] === "string" ? image[0] : "");
    }
    if (typeof image === "object") return image.uri || image.url || image.path || "";
    return String(image);
  };

  const filteredProperties = useMemo(() => properties, [properties]);

  const renderCategory = (category) => {
    const isActive = selectedCategory === category.slug;
    return (
      <TouchableOpacity
        key={category.slug}
        style={[styles.categoryPill, isActive && styles.categoryPillActive]}
        onPress={() => {
          console.log("Selected category:", category);
          setSelectedCategory(category.slug);
        }}
      >
        <Text style={[styles.categoryText, isActive && styles.categoryTextActive]}>{category.name}</Text>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }) => {
    const scale = new Animated.Value(1);
    const onPressIn = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start();
    const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
    const imageUrl = getPrimaryImageUrl(item) || "";
    const isVerified = item.is_verified || item.verified || false;
    // Show price: prefer per month, then week, then day
    let priceValue = "Price unavailable";
    if (item.price_per_month) priceValue = `${item.price_per_month.toLocaleString()} ETB / month`;
    else if (item.price_per_week) priceValue = `${item.price_per_week.toLocaleString()} ETB / week`;
    else if (item.price_per_day) priceValue = `${item.price_per_day.toLocaleString()} ETB / day`;
    const badgeLabel = makeString(item.property_type || item.type || item.listing_type);
    const locationText = makeString(item.location || item.city || item.address);
    const titleText = makeString(item.title || item.name);

    const handleCardPress = () => {
      const now = Date.now();
      const isDoubleTap = now - lastTapRef.current <= 300;
      lastTapRef.current = now;
      if (isDoubleTap) {
        const slugValue = item.slug;
        const id = item.id;
        const routeImage = imageUrl;
        const routeTitle = titleText;
        const routePricePerDay = item.price_per_day || item.price || null;
        console.log("NAVIGATE PROPERTY DETAIL", { slug: slugValue, id });
        navigation.navigate("PropertyDetailScreen", {
          slug: slugValue,
          id,
          image: routeImage,
          title: routeTitle,
          pricePerDay: routePricePerDay,
        });
      }
    };

    return (
      <Pressable
        onPress={handleCardPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      >
        <ImageWithFallback sourceUri={imageUrl} style={styles.propertyImage} />
        <View style={styles.badgeRow}>
          {isVerified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          )}
          <View style={styles.favoriteCircle}>
            <Icon name="favorite-border" size={20} color="#fff" />
          </View>
        </View>
        <View style={styles.cardContent}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.priceText}>{priceValue}</Text>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>{badgeLabel}</Text>
            </View>
          </View>
          <Text style={styles.locationText}>{locationText}</Text>
          <Text style={styles.propertyTitle} numberOfLines={2}>{titleText}</Text>
        </View>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.heading}>Find Your Home</Text>
        <Text style={styles.subheading}>Search the best rentals in Addis Ababa</Text>
      </View>
      <View style={styles.searchSection}>
        <View style={styles.searchInputContainer}>
          <Icon name="search" size={22} color="#b0b0b0" style={styles.searchIcon} />
          <TextInput
            placeholder="Search by location..."
            placeholderTextColor="#999"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>
      <View style={styles.categoryRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryContainer}>
          {categories.map(renderCategory)}
        </ScrollView>
      </View>
      <FlatList
        data={filteredProperties}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {selectedCategory !== "All"
              ? "No listings found for this category."
              : "No properties found."}
          </Text>
        }
      />
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.muted,
  },
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  heading: {
    fontSize: 32,
    fontWeight: "900",
    color: colors.text,
    marginBottom: 8,
  },
  subheading: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  searchSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 24,
    paddingHorizontal: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
  },
  searchIcon: {
    marginRight: 10,
    color: colors.placeholder,
  },
  searchInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: colors.text,
  },
  categoryRow: {
    marginBottom: 16,
  },
  categoryContainer: {
    paddingLeft: 20,
    paddingRight: 8,
  },
  categoryPill: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginRight: 12,
  },
  categoryPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  categoryTextActive: {
    color: colors.surface,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    marginBottom: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
    overflow: "hidden",
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
  },
  propertyImage: {
    width: "100%",
    height: 220,
  },
  badgeRow: {
    position: "absolute",
    top: 18,
    left: 18,
    right: 18,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  verifiedBadge: {
    backgroundColor: "rgba(34,139,34,0.95)",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  verifiedText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  favoriteCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  cardContent: {
    padding: 18,
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
  typeBadge: {
    backgroundColor: colors.soft,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  typeBadgeText: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 12,
  },
  locationText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  propertyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
    lineHeight: 28,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 40,
    color: colors.placeholder,
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});