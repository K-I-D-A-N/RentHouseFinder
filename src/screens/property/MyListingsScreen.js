import React, { useEffect, useMemo, useState, useCallback } from "react";
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
import { getMyListings, deleteProperty } from "../../api/propertyApi";
import { getMyRequests, updateBookingStatus } from "../../api/bookingApi";
import { useFocusEffect } from "@react-navigation/native";
import { getPrimaryImageUrl } from "../../utils/dataHelpers";
import ImageWithFallback from "../../components/ImageWithFallback";

export default function MyListingsScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState("listings"); // "listings" | "requests"
  const [properties, setProperties] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState(null); // booking id being updated
  const { colors } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Listings fetch
  const loadUserProperties = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getMyListings();
      const data = response.data;
      const items = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
        ? data.items
        : [];
      setProperties(items);
    } catch (error) {
      console.error("Failed to load user properties", error);
      Alert.alert("Error", "Failed to load your listings. Please try again.");
      setProperties([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (activeTab === "listings") {
        loadUserProperties();
      }
    }, [activeTab, loadUserProperties])
  );

  // Requests fetch
  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getMyRequests();
      const data = response.data;
      const items = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
        ? data.items
        : [];
      setRequests(items);
    } catch (error) {
      console.error("Failed to load booking requests", error);
      Alert.alert("Error", "Failed to load booking requests. Please try again.");
      setRequests([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Tab effect
  useEffect(() => {
    if (activeTab === "listings") {
      loadUserProperties();
    } else {
      loadRequests();
    }
  }, [activeTab, loadUserProperties, loadRequests]);

  const onRefresh = () => {
    setRefreshing(true);
    if (activeTab === "listings") loadUserProperties();
    else loadRequests();
  };

  // Delete property
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
              setProperties((prev) => prev.filter((p) => p.id !== propertyId));
              Alert.alert("Success", "Property deleted successfully");
              // Navigate to Home tab to refresh global listings
              try {
                navigation.getParent()?.navigate("HomeTab", { screen: "Home" });
              } catch (navErr) {
                // ignore navigation errors
              }
            } catch (error) {
              console.error("Failed to delete property", error);
              Alert.alert("Error", "Failed to delete listing. Please try again.");
            }
          },
        },
      ]
    );
  };

  // Approve/Reject booking request
  const handleUpdateRequest = async (bookingId, status) => {
    setUpdatingId(bookingId);
    try {
      if (status === "approved") {
        await updateBookingStatus(bookingId, "approved");
        Alert.alert("Success", "Booking approved.");
      } else {
        await updateBookingStatus(bookingId, "rejected", "Rejected by landlord");
        Alert.alert("Success", "Booking rejected.");
      }
      // Refresh requests
      loadRequests();
    } catch (error) {
      console.error("Failed to update booking status", error);
      Alert.alert("Error", "Failed to update booking status. Please try again.");
    } finally {
      setUpdatingId(null);
    }
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
        <ImageWithFallback sourceUri={imageUrl} style={styles.propertyImage} />
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
                navigation.navigate("EditListingScreen", {
                  listingId: item.id,
                  slug: item.slug,
                  listingData: item,
                })
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

      {/* Tab Switcher */}
      <View style={styles.tabSwitcher}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === "listings" && styles.tabButtonActive]}
          onPress={() => setActiveTab("listings")}
        >
          <Text style={[styles.tabText, activeTab === "listings" && styles.tabTextActive]}>My Listings</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === "requests" && styles.tabButtonActive]}
          onPress={() => setActiveTab("requests")}
        >
          <Text style={[styles.tabText, activeTab === "requests" && styles.tabTextActive]}>Requests</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : activeTab === "listings" ? (
        properties.length === 0 ? (
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
        )
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <View style={styles.requestCard}>
              <ImageWithFallback sourceUri={getPrimaryImageUrl(item.listing) || ""} style={styles.requestImage} />
              <View style={styles.requestContent}>
                <Text style={styles.requestTitle}>{item.listing?.title || "Untitled"}</Text>
                <Text style={styles.requestRenter}>{item.renter_name || item.renter?.name || "Unknown renter"}</Text>
                <Text style={styles.requestEmail}>{item.renter_email || item.renter?.email || ""}</Text>
                <Text style={styles.requestDates}>
                  {item.start_date} → {item.end_date}
                </Text>
                <Text style={styles.requestPrice}>Total: {item.total_price ? `${item.total_price.toLocaleString()} ETB` : "-"}</Text>
                <View style={[styles.statusBadge, styles[`status${(item.status || "").toUpperCase()}`]]}>
                  <Text style={styles.statusBadgeText}>{(item.status || "PENDING").toUpperCase()}</Text>
                </View>
                {item.status === "pending" && (
                  <View style={styles.requestActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.approveButton, updatingId === item.id && styles.actionButtonDisabled]}
                      onPress={() => handleUpdateRequest(item.id, "approved")}
                      disabled={updatingId === item.id}
                    >
                      <Text style={styles.actionButtonText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.rejectButton, updatingId === item.id && styles.actionButtonDisabled]}
                      onPress={() => handleUpdateRequest(item.id, "rejected")}
                      disabled={updatingId === item.id}
                    >
                      <Text style={styles.actionButtonText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="mail-outline" size={64} color={colors.textSecondary} />
              <Text style={styles.emptyTitle}>No Requests</Text>
              <Text style={styles.emptyDescription}>No booking requests yet.</Text>
            </View>
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
    tabSwitcher: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border || colors.muted,
    },
    tabButton: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabButtonActive: {
      borderBottomColor: colors.primary,
      backgroundColor: colors.surface,
    },
    tabText: {
      fontSize: 16,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    tabTextActive: {
      color: colors.primary,
    },
    requestCard: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: 12,
      marginVertical: 8,
      marginHorizontal: 8,
      padding: 12,
      elevation: 2,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
    },
    requestImage: {
      width: 80,
      height: 80,
      borderRadius: 8,
      marginRight: 12,
      backgroundColor: colors.muted,
    },
    requestContent: {
      flex: 1,
      justifyContent: 'center',
    },
    requestTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 2,
    },
    requestRenter: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    requestEmail: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 2,
    },
    requestDates: {
      fontSize: 13,
      color: colors.text,
      marginBottom: 2,
    },
    requestPrice: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: '600',
      marginBottom: 2,
    },
    statusBadge: {
      alignSelf: 'flex-start',
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 3,
      marginTop: 4,
      marginBottom: 4,
    },
    statusPENDING: {
      backgroundColor: '#ffeeba',
    },
    statusAPPROVED: {
      backgroundColor: '#d4edda',
    },
    statusREJECTED: {
      backgroundColor: '#f8d7da',
    },
    statusBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.text,
    },
    requestActions: {
      flexDirection: 'row',
      marginTop: 8,
    },
    actionButton: {
      flex: 1,
      paddingVertical: 8,
      marginHorizontal: 4,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    approveButton: {
      backgroundColor: colors.primary,
    },
    rejectButton: {
      backgroundColor: '#e74c3c',
    },
    actionButtonText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 15,
    },
    actionButtonDisabled: {
      opacity: 0.6,
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
