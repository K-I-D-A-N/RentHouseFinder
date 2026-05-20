import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Image,
  Alert,
  Pressable,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import useTheme from "../../hooks/useTheme";
import useAuth from "../../hooks/useAuth";
import { getProperties, deleteProperty } from "../../api/propertyApi";

export default function MyListingsScreen({ navigation }) {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { colors } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const userId = user?.id || user?.user_id;

  const loadUserProperties = async () => {
    try {
      setLoading(true);
      // Fetch all properties and filter by user
      const response = await getProperties();
      const data = response.data;
      const items = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
        ? data.items
        : [];

      // Filter properties by current user
      const userProperties = items.filter((item) => {
        const itemUserId = item.user_id || item.owner_id || item.user?.id;
        return itemUserId === userId || item.owner === user?.id;
      });

      setProperties(userProperties);
    } catch (error) {
      console.error("Failed to load user properties", error);
      Alert.alert("Error", "Failed to load your listings. Please try again.");
      setProperties([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (userId) {
      loadUserProperties();
    }
  }, [userId]);

  const onRefresh = () => {
    setRefreshing(true);
    loadUserProperties();
  };

  const handleDeleteProperty = (propertyId, propertyTitle) => {
    Alert.alert(
      "Delete Listing",
      `Are you sure you want to delete "${propertyTitle}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteProperty(propertyId);
              setProperties(properties.filter((p) => p.id !== propertyId));
              Alert.alert("Success", "Listing deleted successfully.");
            } catch (error) {
              console.error("Failed to delete property", error);
              Alert.alert("Error", "Failed to delete listing. Please try again.");
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }) => {
    const scale = new Animated.Value(1);
    const onPressIn = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start();
    const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

    const imageUrl = item.image || item.cover_image || item.images?.[0] || "https://via.placeholder.com/540x360?text=Property";
    const isVerified = item.is_verified || item.verified || false;
    const priceValue = item.price ? `${item.price.toLocaleString()} ETB / month` : "Price unavailable";
    const badgeLabel = item.property_type || item.type || item.listing_type || "Property";
    const locationText = item.location || item.city || item.address || "";
    const titleText = item.title || item.name || "";

    return (
      <Pressable
        onPress={() => navigation.navigate("HomeTab", { screen: "PropertyDetailScreen", params: { id: item.id, slug: item.slug } })}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      >
        <Image source={{ uri: imageUrl }} style={styles.propertyImage} />
        <View style={styles.badgeRow}>
          {isVerified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          )}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() =>
                navigation.navigate("EditProperty", { propertyId: item.id })
              }
            >
              <Ionicons name="pencil" size={16} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteProperty(item.id, titleText)}
            >
              <Ionicons name="trash" size={16} color="#fff" />
            </TouchableOpacity>
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
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.heading}>My Listings</Text>
        <TouchableOpacity
          onPress={() => navigation.getParent()?.navigate("Post")}
          style={styles.addButton}
        >
          <Ionicons name="add" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {properties.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="home-outline" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>No Listings Yet</Text>
          <Text style={styles.emptyDescription}>
            You haven't posted any properties yet. Start by creating your first listing!
          </Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => navigation.getParent()?.navigate("Post")}
          >
            <Ionicons name="add" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.createButtonText}>Create Listing</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={properties}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.muted,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.muted,
    },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 12,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border || colors.muted,
    },
    backButton: {
      padding: 8,
      marginLeft: -8,
    },
    heading: {
      fontSize: 24,
      fontWeight: "700",
      color: colors.text,
      flex: 1,
      textAlign: "center",
    },
    addButton: {
      padding: 8,
      marginRight: -8,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 32,
      backgroundColor: colors.muted,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
      marginTop: 16,
      marginBottom: 8,
    },
    emptyDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 20,
      marginBottom: 24,
    },
    createButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primary,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 12,
    },
    createButtonText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "600",
    },
    listContent: {
      paddingHorizontal: 12,
      paddingVertical: 12,
      paddingBottom: 100,
    },
    card: {
      marginHorizontal: 8,
      marginVertical: 8,
      borderRadius: 12,
      backgroundColor: colors.surface,
      overflow: "hidden",
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 3,
    },
    cardPressed: {
      opacity: 0.95,
    },
    propertyImage: {
      width: "100%",
      height: 200,
      backgroundColor: colors.muted,
    },
    badgeRow: {
      position: "absolute",
      top: 12,
      left: 12,
      right: 12,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    verifiedBadge: {
      backgroundColor: "#4CAF50",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
    },
    verifiedText: {
      color: "#fff",
      fontSize: 12,
      fontWeight: "600",
    },
    actionButtons: {
      flexDirection: "row",
      gap: 8,
    },
    editButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.primary,
      justifyContent: "center",
      alignItems: "center",
    },
    deleteButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: "#FF6B6B",
      justifyContent: "center",
      alignItems: "center",
    },
    cardContent: {
      padding: 12,
    },
    cardTitleRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    priceText: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.primary,
      flex: 1,
    },
    typeBadge: {
      backgroundColor: "rgba(255, 107, 0, 0.12)",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
    },
    typeBadgeText: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.primary,
    },
    locationText: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 6,
    },
    propertyTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
      lineHeight: 20,
    },
  });
