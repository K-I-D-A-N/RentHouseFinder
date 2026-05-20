import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  TextInput,
} from "react-native";
import useTheme from "../../hooks/useTheme";
import { createBooking } from "../../api/bookingApi";
import { getPropertyById } from "../../api/propertyApi";

const formatDate = (date) => {
  if (!date) return "";
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const makeImageUri = (image) => {
  if (!image) return "";
  if (typeof image === "string") return image;
  if (typeof image === "object") return image.uri || image.url || image.path || "";
  return String(image);
};

const parseInputDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
};

export default function BookingScreen({ route, navigation }) {
  const { colors } = useTheme();
  const { listingId, pricePerDay: routePricePerDay, title: routeTitle, image: routeImage } = route.params || {};

  const [property, setProperty] = useState(null);
  const [propertyLoading, setPropertyLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [startInput, setStartInput] = useState("");
  const [endInput, setEndInput] = useState("");
  const [totalDays, setTotalDays] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);
  const [dateError, setDateError] = useState("");

  useEffect(() => {
    if (!listingId) return;

    const loadProperty = async () => {
      setPropertyLoading(true);
      try {
        const response = await getPropertyById(listingId);
        setProperty(response.data);
      } catch (error) {
        console.warn("BookingScreen property fetch failed", error.response?.data || error.message || error);
      } finally {
        setPropertyLoading(false);
      }
    };

    loadProperty();
  }, [listingId]);

  const effectivePricePerDay = Number(routePricePerDay ?? property?.price_per_day ?? property?.price ?? 0);
  const effectiveTitle = routeTitle || property?.title || property?.name || "Property";

  useEffect(() => {
    if (!startDate || !endDate) {
      setTotalDays(0);
      setTotalPrice(0);
      setDateError("");
      return;
    }

    const diff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diff <= 0) {
      setTotalDays(0);
      setTotalPrice(0);
      setDateError("End date must be after start date");
      return;
    }

    setDateError("");
    setTotalDays(diff);
    setTotalPrice(diff * effectivePricePerDay);
  }, [startDate, endDate, effectivePricePerDay]);

  const imageUri =
    makeImageUri(routeImage) ||
    makeImageUri(property?.images?.[0]) ||
    makeImageUri(property?.image) ||
    makeImageUri(property?.cover_image) ||
    "https://via.placeholder.com/400x250?text=Property";

  const setStartDateFromString = (value) => {
    setStartInput(value);
    setStartDate(parseInputDate(value));
  };

  const setEndDateFromString = (value) => {
    setEndInput(value);
    setEndDate(parseInputDate(value));
  };

  const startDateString = startDate ? formatDate(startDate) : startInput;
  const endDateString = endDate ? formatDate(endDate) : endInput;
  const startInputError = startInput && !startDate ? "Date must be YYYY-MM-DD" : "";
  const endInputError = endInput && !endDate ? "Date must be YYYY-MM-DD" : "";

  const canSubmit = Boolean(listingId && startDate && endDate && totalDays > 0 && !loading && !dateError);

  const handleBooking = async () => {
    if (!listingId) {
      Alert.alert("Error", "Listing ID is missing. Please select a property again.");
      return;
    }

    if (!startDate || !endDate || totalDays <= 0) {
      Alert.alert("Validation", "Please choose valid booking dates.");
      return;
    }

    setLoading(true);
    try {
      await createBooking({
        listing_id: listingId,
        start_date: formatDate(startDate),
        end_date: formatDate(endDate),
        note: "",
      });
      Alert.alert("Success", "Your booking is pending approval", [
        { text: "OK", onPress: () => navigation.navigate("Profile", { screen: "MyBookings" }) },
      ]);
    } catch (error) {
      console.error("Booking failed", error.response?.data || error.message || error);
      const message = error.response?.data?.detail || error.message || "Failed to create booking. Please try again.";
      Alert.alert("Error", typeof message === "string" ? message : "Failed to create booking. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!listingId) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}> 
        <Text style={[styles.emptyText, { color: colors.text }]}>Invalid booking request. Please select a property from the list.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.outerContainer, { backgroundColor: colors.background }]}> 
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.heading, { color: colors.text }]}>Confirm booking</Text>

        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
          <Image source={{ uri: imageUri }} style={styles.summaryImage} resizeMode="cover" />
          <View style={styles.summaryDetails}>
            <Text style={[styles.summaryTitle, { color: colors.text }]} numberOfLines={2}>{effectiveTitle}</Text>
            <Text style={[styles.summaryPrice, { color: colors.primary }]}>{`ETB ${Number(effectivePricePerDay || 0).toLocaleString()} / day`}</Text>
            {propertyLoading && (
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading listing details…</Text>
            )}
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Booking dates</Text>

          <View style={[styles.dateInput, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}> 
            <Text style={[styles.inputLabel, { color: colors.text }]}>Start Date</Text>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.placeholder}
              value={startInput}
              onChangeText={setStartDateFromString}
              keyboardType="numbers-and-punctuation"
            />
            {startInputError ? <Text style={styles.validationError}>{startInputError}</Text> : null}
          </View>

          <View style={[styles.dateInput, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}> 
            <Text style={[styles.inputLabel, { color: colors.text }]}>End Date</Text>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.placeholder}
              value={endInput}
              onChangeText={setEndDateFromString}
              keyboardType="numbers-and-punctuation"
            />
            {endInputError ? <Text style={styles.validationError}>{endInputError}</Text> : null}
          </View>

          {dateError ? <Text style={styles.validationError}>{dateError}</Text> : null}
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Price summary</Text>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Total days</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{totalDays || "-"}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Price per day</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{`ETB ${Number(effectivePricePerDay || 0).toLocaleString()}`}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Total price</Text>
            <Text style={[styles.totalAmount, { color: colors.primary }]}>{`ETB ${totalPrice.toLocaleString()}`}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.submitButton,
            {
              backgroundColor: canSubmit ? colors.primaryDark : colors.inputBackground,
              borderColor: colors.border,
              borderWidth: 1,
            },
          ]}
          onPress={handleBooking}
          disabled={!canSubmit}
        >
          {loading ? (
            <ActivityIndicator color={canSubmit ? colors.surface : colors.textSecondary} />
          ) : (
            <Text style={[styles.submitText, { color: canSubmit ? colors.surface : colors.textSecondary }]}>Book Now</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footerSpacing} />
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 140,
  },
  heading: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 20,
  },
  summaryCard: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 20,
    borderWidth: 1,
  },
  summaryImage: {
    width: "100%",
    height: 180,
  },
  summaryDetails: {
    padding: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
  },
  summaryPrice: {
    fontSize: 16,
    fontWeight: "700",
  },
  loadingText: {
    marginTop: 6,
    fontSize: 14,
  },
  section: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 14,
  },
  dateInput: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 16,
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
  },
  dateText: {
    fontSize: 16,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: "800",
  },
  validationError: {
    color: "#d32f2f",
    marginTop: 8,
    fontWeight: "700",
  },
  footerSpacing: {
    height: 92,
  },
  submitButton: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  submitText: {
    fontSize: 16,
    fontWeight: "800",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});