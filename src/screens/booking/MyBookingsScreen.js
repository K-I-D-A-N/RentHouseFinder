import React, { useCallback, useState } from "react";
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getMyBookings } from "../../api/bookingApi";
import useTheme from "../../hooks/useTheme";

const statusColor = (status, colors) => {
  const normalized = String(status || "").toLowerCase();
  if (normalized.includes("pending")) return "#f5a623";
  if (normalized.includes("approved")) return "#2e7d32";
  if (normalized.includes("rejected")) return "#c62828";
  if (normalized.includes("completed")) return "#1565c0";
  return colors.primary;
};

export default function MyBookingsScreen() {
  const { colors } = useTheme();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

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
      <Text style={[styles.title, { color: colors.text }]}>My Bookings</Text>
      <FlatList
        data={bookings}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
            <Text style={[styles.propertyName, { color: colors.text }]}>{item.property_title || item.listing_title || item.listing?.title || "Booking"}</Text>
            <Text style={[styles.propertyDetail, { color: colors.textSecondary }]}>{item.status || "Status unavailable"}</Text>
            <Text style={[styles.propertyDetail, { color: colors.textSecondary }]}>{item.start_date || item.booking_date || item.check_in_date || "Date unavailable"}</Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No bookings yet.</Text>
          </View>
        }
        contentContainerStyle={bookings.length ? styles.list : styles.emptyList}
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