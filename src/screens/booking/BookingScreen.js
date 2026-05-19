import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, TextInput } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { createBooking } from "../../api/bookingApi";
import { getPropertyById } from "../../api/propertyApi";

export default function BookingScreen({ route, navigation }) {
  const { propertyId } = route.params || {};
  const [property, setProperty] = useState(null);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState("1");
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    const loadProperty = async () => {
      try {
        const response = await getPropertyById(propertyId);
        setProperty(response.data);
      } catch (error) {
        console.error("Failed to load property", error);
        Alert.alert("Error", "Failed to load property details.");
      } finally {
        setLoading(false);
      }
    };
    if (propertyId) {
      loadProperty();
    } else {
      setLoading(false);
    }
  }, [propertyId]);

  const calculateTotal = () => {
    if (!property || !checkIn || !checkOut) return 0;
    const days = Math.max(1, Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)));
    return (property.price || 0) * days;
  };

  const handleBooking = async () => {
    if (!checkIn || !checkOut) {
      Alert.alert("Validation", "Please select check-in and check-out dates.");
      return;
    }
    if (new Date(checkIn) >= new Date(checkOut)) {
      Alert.alert("Validation", "Check-out date must be after check-in date.");
      return;
    }
    setBookingLoading(true);
    try {
      await createBooking({
        property: propertyId,
        check_in: checkIn,
        check_out: checkOut,
        guests: parseInt(guests),
      });
      Alert.alert("Success", "Booking confirmed!", [
        { text: "OK", onPress: () => navigation.navigate("MyBookings") },
      ]);
    } catch (error) {
      console.error("Booking failed", error);
      Alert.alert("Error", "Failed to create booking. Please try again.");
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!property) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Property not found.</Text>
      </View>
    );
  }

  const total = calculateTotal();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.propertyCard}>
        <Text style={styles.propertyTitle}>{property.title}</Text>
        <Text style={styles.propertyLocation}>{property.location}</Text>
        <Text style={styles.propertyPrice}>${property.price}/night</Text>
      </View>

      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Booking Details</Text>

        <View style={styles.inputContainer}>
          <Icon name="date-range" size={20} color="#666" style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Check-in Date (YYYY-MM-DD)"
            value={checkIn}
            onChangeText={setCheckIn}
          />
        </View>

        <View style={styles.inputContainer}>
          <Icon name="date-range" size={20} color="#666" style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Check-out Date (YYYY-MM-DD)"
            value={checkOut}
            onChangeText={setCheckOut}
          />
        </View>

        <View style={styles.inputContainer}>
          <Icon name="group" size={20} color="#666" style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Number of Guests"
            keyboardType="numeric"
            value={guests}
            onChangeText={setGuests}
          />
        </View>
      </View>

      <View style={styles.priceSection}>
        <Text style={styles.sectionTitle}>Price Breakdown</Text>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>${property.price} x {Math.max(1, Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)))} nights</Text>
          <Text style={styles.priceValue}>${total}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>${total}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.bookButton} onPress={handleBooking} disabled={bookingLoading}>
        {bookingLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.bookButtonText}>Confirm Booking</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  content: {
    padding: 16,
  },
  propertyCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  propertyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  propertyLocation: {
    fontSize: 16,
    color: "#666",
    marginBottom: 8,
  },
  propertyPrice: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#007bff",
  },
  formSection: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: "#fafafa",
  },
  icon: {
    marginLeft: 12,
  },
  input: {
    flex: 1,
    padding: 14,
    fontSize: 16,
  },
  priceSection: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 16,
    color: "#555",
  },
  priceValue: {
    fontSize: 16,
    color: "#333",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#007bff",
  },
  bookButton: {
    backgroundColor: "#007bff",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
  },
  bookButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    color: "#666",
    fontSize: 16,
  },
});