import React, { useEffect, useState } from "react";
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from "react-native";
import { getMyBookings } from "../../api/bookingApi";

export default function MyBookingsScreen() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBookings = async () => {
      try {
        const response = await getMyBookings();
        setBookings(response.data || []);
      } catch (error) {
        console.error("Failed to load bookings", error);
      } finally {
        setLoading(false);
      }
    };
    loadBookings();
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Bookings</Text>
      <FlatList
        data={bookings}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.propertyName}>{item.property_title || item.listing_title || "Booking"}</Text>
            <Text style={styles.propertyDetail}>{item.status || "Status unavailable"}</Text>
            <Text style={styles.propertyDetail}>{item.booking_date || item.start_date || "Date unavailable"}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No bookings found.</Text>}
        contentContainerStyle={styles.list}
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
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    backgroundColor: "#fafafa",
  },
  propertyName: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  propertyDetail: {
    fontSize: 14,
    color: "#555",
  },
  emptyText: {
    textAlign: "center",
    marginTop: 24,
    color: "#888",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});