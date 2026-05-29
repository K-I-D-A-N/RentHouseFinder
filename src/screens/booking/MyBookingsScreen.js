import React, { useCallback, useState } from "react";
import { View, Text, FlatList, ActivityIndicator, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { getMyBookings } from "../../api/bookingApi";
import { useNavigation } from "@react-navigation/native";
import useTheme from "../../hooks/useTheme";
import ReviewModal from "../../components/ReviewModal";

const statusColor = (status, colors) => {
  const normalized = String(status || "").toLowerCase();
  if (normalized.includes("pending")) return "#f5a623";
  if (normalized.includes("approved")) return "#2e7d32";
  if (normalized.includes("rejected")) return "#c62828";
  if (normalized.includes("completed")) return "#1565c0";
  return colors.primary;
};

export default function MyBookingsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const response = await getMyBookings();
      console.log("BOOKINGS RESPONSE:", response.data);
      const items = response.data?.items ?? response.data?.results ?? response.data ?? [];
      setBookings(Array.isArray(items) ? items : []);
    } catch (error) {
      console.error("Bookings fetch failed:", error.response?.data || error.message || error);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchBookings();
    }, [])
  );

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}> 
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <Text style={[styles.title, { color: colors.text }]}>{t("myBookings.title")}</Text>
      <FlatList
        data={bookings}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
            <Text style={[styles.propertyName, { color: colors.text }]}> 
              {item.property_title || item.listing_title || item.listing?.title || item.title || t("myBookings.propertyDeleted")}
            </Text>
            <Text style={[styles.propertyDetail, { color: colors.textSecondary }]}>{item.status || t("myBookings.statusUnavailable")}</Text>
            <Text style={[styles.propertyDetail, { color: colors.textSecondary }]}>{item.start_date || item.booking_date || item.check_in_date || t("myBookings.dateUnavailable")}</Text>
            {/* Pay Now button for Approved bookings */}
            {String(item.status).toLowerCase() === "approved" && (item.listing_slug || item.listing?.slug || item.property_slug || item.slug) && (
              <TouchableOpacity
                style={{
                  marginTop: 10,
                  backgroundColor: colors.primary,
                  padding: 12,
                  borderRadius: 8,
                  alignItems: "center",
                }}
                onPress={async () => {
                  navigation.navigate("PaymentScreen", { booking: item });
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "bold" }}>{t("myBookings.payNow")}</Text>
              </TouchableOpacity>
            )}
            {String(item.status).toLowerCase() === "completed" && (
              <TouchableOpacity
                style={{
                  marginTop: 10,
                  backgroundColor: colors.primary,
                  padding: 12,
                  borderRadius: 8,
                  alignItems: "center",
                }}
                onPress={() => {
                  setSelectedBooking(item);
                  setReviewModalVisible(true);
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "bold" }}>{t("myBookings.writeReview")}</Text>
              </TouchableOpacity>
            )}
            {String(item.status).toLowerCase() === "approved" && !(item.listing_slug || item.listing?.slug || item.property_slug || item.slug) && (
              <Text style={[styles.propertyDetail, { color: colors.textSecondary, marginTop: 10 }]}>{t("myBookings.removedListing")}</Text>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t("myBookings.empty")}</Text>
          </View>
        }
        contentContainerStyle={bookings.length ? styles.list : styles.emptyList}
        // Refresh bookings when returning from PaymentScreen
        extraData={bookings}
      />
      <ReviewModal
        visible={reviewModalVisible}
        booking={selectedBooking}
        onClose={() => {
          setReviewModalVisible(false);
          setSelectedBooking(null);
        }}
        onSuccess={() => {
          setReviewModalVisible(false);
          const listingId = selectedBooking?.listing || selectedBooking?.property || selectedBooking?.listing_id || selectedBooking?.property_id;
          if (listingId) {
            navigation.navigate("PropertyDetailScreen", { id: listingId });
          }
          // refresh bookings list to reflect any server-side changes
          fetchBookings();
        }}
      />
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 16,
  },
  list: {
    paddingBottom: 24,
  },
  card: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  propertyName: {
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },
  propertyDetail: {
    fontSize: 14,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 24,
    color: "#888",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 40,
  },
  emptyList: {
    flexGrow: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});