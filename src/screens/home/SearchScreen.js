import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  RefreshControl,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { MaterialIcons as Icon } from "@expo/vector-icons";
import useTheme from "../../hooks/useTheme";
import { getProperties } from "../../api/propertyApi";
import { getCategories } from "../../api/categoryApi";
import { getPrimaryImageUrl, sortByFeatured } from "../../utils/dataHelpers";
import PropertyCard from "../../components/PropertyCard";
import PropertyCardSkeleton from "../../components/PropertyCardSkeleton";

const defaultPropertyTypes = [{ name: "All Types", value: "All Types" }];
const PAGE_SIZE = 15;
const SKELETON_ITEMS = Array.from({ length: 4 }, (_, i) => ({ id: `skeleton-${i}` }));

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const normalizeListResponse = (data) => {
  if (Array.isArray(data)) {
    return { items: data, hasMore: false };
  }

  const items = Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data?.results)
      ? data.results
      : [];

  const total = data?.count ?? data?.total;
  const hasMore =
    data?.next != null ||
    (typeof total === "number" && items.length < total) ||
    items.length >= PAGE_SIZE;

  return { items, hasMore };
};

const getCategoryValue = (item) => {
  if (item.category_name) return String(item.category_name).trim();
  if (item.category?.name) return String(item.category.name).trim();
  if (typeof item.category === "string") return item.category.trim();
  if (item.property_type) return String(item.property_type).trim();
  if (item.type) return String(item.type).trim();
  return "";
};

export default function SearchScreen({ navigation }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [location, setLocation] = useState("");
  const [selectedType, setSelectedType] = useState("All Types");
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);
  const [propertyTypes, setPropertyTypes] = useState(defaultPropertyTypes);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMoreApi, setHasMoreApi] = useState(false);
  const [apiPaginates, setApiPaginates] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const debounceRef = useRef(null);

  const buildApiParams = useCallback((pageNum = 1) => {
    const params = { page: pageNum, page_size: PAGE_SIZE };
    if (location?.trim()) params.search = location.trim();
    if (minPrice) params.min_price = minPrice;
    if (maxPrice) params.max_price = maxPrice;
    return params;
  }, [location, minPrice, maxPrice]);

  const loadProperties = useCallback(async (pageNum = 1, { append = false, isRefresh = false } = {}) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else if (!isRefresh) {
        setLoading(true);
      }

      const response = await getProperties(buildApiParams(pageNum));
      const { items, hasMore } = normalizeListResponse(response.data);
      const sorted = sortByFeatured(items);

      setApiPaginates(hasMore || pageNum > 1 || !Array.isArray(response.data));
      setHasMoreApi(hasMore);

      if (append) {
        setProperties((prev) => sortByFeatured([...prev, ...sorted]));
      } else {
        setProperties(sorted);
        setVisibleCount(PAGE_SIZE);
      }
      setPage(pageNum);
    } catch (error) {
      console.error("Failed to load properties", error);
      if (!append) setProperties([]);
      setHasMoreApi(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [buildApiParams]);

  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const response = await getCategories();
        const data = Array.isArray(response.data) ? response.data : [];
        setPropertyTypes([
          { name: "All Types", value: "All Types" },
          ...data.map((category) => ({
            name: category.name || category.title || t("common.unknown"),
            value: category.name || category.title || t("common.unknown"),
          })),
        ]);
      } catch (error) {
        console.warn("Failed to fetch property types", error);
      }
    };

    fetchTypes();
  }, [t]);

  useEffect(() => {
    loadProperties(1);
  }, [loadProperties]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      loadProperties(1);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [location, minPrice, maxPrice, loadProperties]);

  const filteredProperties = useMemo(() => {
    if (selectedType === "All Types") return properties;

    const normalizedSelected = selectedType?.trim().toLowerCase();
    return properties.filter((item) => {
      const categoryValue = getCategoryValue(item);
      return categoryValue?.toLowerCase() === normalizedSelected;
    });
  }, [properties, selectedType]);

  const displayedProperties = useMemo(() => {
    if (apiPaginates && hasMoreApi) return filteredProperties;
    return filteredProperties.slice(0, visibleCount);
  }, [filteredProperties, visibleCount, hasMoreApi, apiPaginates]);

  const canLoadMore = useMemo(() => {
    if (apiPaginates && hasMoreApi) return true;
    return visibleCount < filteredProperties.length;
  }, [apiPaginates, hasMoreApi, visibleCount, filteredProperties.length]);

  const resultCount = filteredProperties.length;

  const toggleFilters = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setFiltersCollapsed((prev) => !prev);
  };

  const resetFilters = () => {
    setMinPrice("");
    setMaxPrice("");
    setLocation("");
    setSelectedType("All Types");
    setVisibleCount(PAGE_SIZE);
  };

  const onRefresh = () => {
    setRefreshing(true);
    setVisibleCount(PAGE_SIZE);
    loadProperties(1, { isRefresh: true });
  };

  const handleLoadMore = () => {
    if (loading || loadingMore || !canLoadMore) return;
    if (apiPaginates && hasMoreApi) {
      loadProperties(page + 1, { append: true });
    } else {
      setVisibleCount((prev) => prev + PAGE_SIZE);
    }
  };

  const navigateToDetail = (item) => {
    const imageUrl = getPrimaryImageUrl(item) || "";
    navigation.navigate("HomeTab", {
      screen: "PropertyDetailScreen",
      params: {
        id: item.id,
        slug: item.slug,
        image: imageUrl,
        title: item.title || item.name,
        pricePerDay: item.price_per_day || item.price || null,
      },
    });
  };

  const renderPropertyItem = ({ item }) => (
    <PropertyCard
      property={item}
      onPress={() => navigateToDetail(item)}
      onActionPress={() => navigateToDetail(item)}
      actionLabel={t("home.viewDetails")}
    />
  );

  const renderSkeletonItem = () => <PropertyCardSkeleton />;

  const ResultsHeader = () => (
    <View style={styles.resultsHeader}>
      <Text style={styles.resultsHeaderText}>
        {resultCount === 1 ? (
          "1 property found"
        ) : (
          <>
            <Text style={styles.resultsCountBold}>{resultCount}</Text>
            {" properties found for your search"}
          </>
        )}
      </Text>
    </View>
  );

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconCircle}>
        <Icon name="search-off" size={40} color={colors.textSecondary} />
      </View>
      <Text style={styles.emptyTitle}>No properties found</Text>
      <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
      <TouchableOpacity style={styles.resetButton} onPress={resetFilters} activeOpacity={0.85}>
        <Icon name="refresh" size={18} color={colors.surface} style={styles.resetIcon} />
        <Text style={styles.resetButtonText}>Reset filters</Text>
      </TouchableOpacity>
    </View>
  );

  const ListFooter = () => {
    if (loading) return null;
    if (!canLoadMore && displayedProperties.length === 0) return null;

    if (loadingMore) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.footerLoaderText}>Loading more properties...</Text>
        </View>
      );
    }

    if (canLoadMore && displayedProperties.length > 0) {
      return (
        <TouchableOpacity style={styles.loadMoreButton} onPress={handleLoadMore} activeOpacity={0.85}>
          <Text style={styles.loadMoreText}>Load more properties</Text>
        </TouchableOpacity>
      );
    }

    return <View style={styles.footerSpacer} />;
  };

  const listData = loading ? SKELETON_ITEMS : displayedProperties;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}> 
      <View style={styles.topSection}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>{t("search.title")}</Text>
            <Text style={styles.subtitle}>{t("search.subtitle")}</Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Icon name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.filterToggleRow}>
          <TouchableOpacity onPress={toggleFilters} style={styles.collapseButton} activeOpacity={0.8}>
            <Icon name={filtersCollapsed ? "expand-more" : "expand-less"} size={20} color={colors.primary} />
            <Text style={styles.collapseButtonText}>{filtersCollapsed ? "Show filters" : "Hide filters"}</Text>
          </TouchableOpacity>
        </View>

        {!filtersCollapsed && (
          <View style={styles.filterPanel}>
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
                  onChangeText={setMinPrice}
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
                  onChangeText={setMaxPrice}
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
                onChangeText={setLocation}
              />
            </View>

            <Text style={styles.sectionLabel}>{t("search.propertyType")}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.typesScroll}
            >
              {propertyTypes.map((type) => {
                const isActive = selectedType === type.value;
                return (
                  <TouchableOpacity
                    key={type.value}
                    style={[styles.typePill, isActive && styles.typePillActive]}
                    onPress={() => setSelectedType(type.value)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.typePillText, isActive && styles.typePillTextActive]}>
                      {type.value === "All Types" ? t("search.allTypes") : type.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}
      </View>

      <FlatList
        data={listData}
        keyExtractor={(item, index) => (loading ? item.id : String(item.id || item._id || item.slug || index))}
        renderItem={loading ? renderSkeletonItem : renderPropertyItem}
        ListHeaderComponent={!loading && resultCount > 0 ? ResultsHeader : null}
        stickyHeaderIndices={!loading && resultCount > 0 ? [0] : undefined}
        ListEmptyComponent={!loading ? EmptyState : null}
        ListFooterComponent={ListFooter}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 100 },
          !loading && resultCount === 0 && styles.listContentEmpty,
        ]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        initialNumToRender={6}
        maxToRenderPerBatch={10}
        windowSize={7}
        removeClippedSubviews={Platform.OS !== "web"}
      />
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    topSection: {
      backgroundColor: colors.background,
      paddingBottom: 8,
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      paddingHorizontal: 20,
      paddingBottom: 10,
    },
    title: {
      fontSize: 28,
      fontWeight: "900",
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
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.surface,
      justifyContent: "center",
      alignItems: "center",
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    },
    filterToggleRow: {
      paddingHorizontal: 20,
      paddingBottom: 8,
      alignItems: "flex-end",
    },
    collapseButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: colors.surface,
    },
    collapseButtonText: {
      marginLeft: 6,
      color: colors.primary,
      fontWeight: "700",
      fontSize: 13,
    },
    filterPanel: {
      paddingHorizontal: 20,
      paddingBottom: 14,
    },
    sectionLabel: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.textSecondary,
      marginBottom: 8,
    },
    priceInputRow: {
      flexDirection: "row",
      gap: 10,
    },
    priceInput: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    priceInputLabel: {
      fontSize: 11,
      color: colors.textSecondary,
      marginBottom: 6,
      fontWeight: "700",
    },
    input: {
      fontSize: 15,
      color: colors.text,
      padding: 0,
    },
    priceInputUnit: {
      marginTop: 8,
      fontSize: 12,
      color: colors.textSecondary,
    },
    searchBox: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 14,
    },
    searchIcon: {
      marginRight: 10,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
      padding: 0,
    },
    typesScroll: {
      paddingRight: 10,
    },
    typePill: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 999,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: 10,
    },
    typePillActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    typePillText: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.text,
    },
    typePillTextActive: {
      color: colors.surface,
    },
    listContent: {
      paddingHorizontal: 20,
      paddingBottom: 24,
    },
    listContentEmpty: {
      flexGrow: 1,
    },
    resultsHeader: {
      backgroundColor: colors.background,
      paddingVertical: 12,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    resultsHeaderText: {
      fontSize: 15,
      color: colors.textSecondary,
      lineHeight: 22,
    },
    resultsCountBold: {
      fontSize: 16,
      fontWeight: "800",
      color: colors.text,
    },
    emptyState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingTop: 48,
      paddingHorizontal: 32,
    },
    emptyIconCircle: {
      width: 90,
      height: 90,
      borderRadius: 45,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 18,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 14,
      elevation: 4,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: colors.text,
      marginBottom: 8,
      textAlign: "center",
    },
    emptySubtext: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 22,
      marginBottom: 24,
    },
    resetButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primary,
      paddingVertical: 12,
      paddingHorizontal: 22,
      borderRadius: 14,
    },
    resetIcon: {
      marginRight: 8,
    },
    resetButtonText: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.surface,
    },
    footerLoader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 16,
      gap: 8,
    },
    footerLoaderText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    loadMoreButton: {
      alignItems: "center",
      paddingVertical: 14,
      marginTop: 6,
      marginBottom: 8,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    loadMoreText: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.primary,
    },
    footerSpacer: {
      height: 12,
    },
  });
