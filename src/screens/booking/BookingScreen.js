import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTranslation } from "react-i18next";
import useTheme from "../../hooks/useTheme";
import { createBooking } from "../../api/bookingApi";
import { getPropertyById } from "../../api/propertyApi";
import { getPrimaryImageUrl } from "../../utils/dataHelpers";
import ImageWithFallback from "../../components/ImageWithFallback";

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

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const getMidnight = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const formatDisplayDate = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const validateBookingDates = (startDate, endDate, t) => {
  const today = getMidnight(new Date());
  let startDateError = "";
  let endDateError = "";
  let dateRangeError = "";

  if (startDate) {
    const start = getMidnight(startDate);
    if (start < today) startDateError = t("booking.startDatePastError");
  }

  if (endDate) {
    const end = getMidnight(endDate);
    if (end < today) endDateError = t("booking.endDatePastError");
  }

  if (startDate && endDate) {
    const start = getMidnight(startDate);
    const end = getMidnight(endDate);
    if (end <= start) dateRangeError = t("booking.endDateAfterStartError");
  }

  return { startDateError, endDateError, dateRangeError };
};

export default function BookingScreen({ route, navigation }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { listingId, pricePerDay: routePricePerDay, title: routeTitle, image: routeImage } = route.params || {};

  const [property, setProperty] = useState(null);
  const [propertyLoading, setPropertyLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [isStartPickerOpen, setStartPickerOpen] = useState(false);
  const [isEndPickerOpen, setEndPickerOpen] = useState(false);
  const [totalDays, setTotalDays] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);
  const [startDateError, setStartDateError] = useState("");
  const [endDateError, setEndDateError] = useState("");
  const [dateRangeError, setDateRangeError] = useState("");

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
  const effectiveTitle = routeTitle || property?.title || property?.name || t("payment.property");

  useEffect(() => {
    const { startDateError: startErr, endDateError: endErr, dateRangeError: rangeErr } = validateBookingDates(
      startDate,
      endDate,
      t
    );

    setStartDateError(startErr);
    setEndDateError(endErr);
    setDateRangeError(rangeErr);

    if (startDate && endDate && !startErr && !endErr && !rangeErr) {
      const diff = Math.ceil((getMidnight(endDate).getTime() - getMidnight(startDate).getTime()) / MS_PER_DAY);
      if (diff > 0) {
        setTotalDays(diff);
        setTotalPrice(diff * effectivePricePerDay);
        return;
      }
    }

    setTotalDays(0);
    setTotalPrice(0);
  }, [startDate, endDate, effectivePricePerDay, t]);

  const imageUri = getPrimaryImageUrl(property) || makeImageUri(routeImage) || "";

  const canSubmit = Boolean(
    listingId &&
      startDate &&
      endDate &&
      totalDays > 0 &&
      !loading &&
      !startDateError &&
      !endDateError &&
      !dateRangeError
  );

  const handleBooking = async () => {
    if (!listingId) {
      Alert.alert(t("booking.error.title"), t("booking.validation.missingId"));
      return;
    }

    const { startDateError: startErr, endDateError: endErr, dateRangeError: rangeErr } =
      validateBookingDates(startDate, endDate, t);

    if (!startDate || !endDate || totalDays <= 0 || startErr || endErr || rangeErr) {
      setStartDateError(startErr);
      setEndDateError(endErr);
      setDateRangeError(rangeErr);
      Alert.alert(t("booking.error.title"), t("booking.validation.invalidDates"));
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
      Alert.alert(t("booking.success.title"), t("booking.success.message"), [
        { text: t("booking.success.ok"), onPress: () => navigation.navigate("Profile", { screen: "MyBookings" }) },
      ]);
    } catch (error) {
      console.error("Booking failed", error.response?.data || error.message || error);
      const message = error.response?.data?.detail || error.message || t("booking.error.title");
      Alert.alert(t("booking.error.title"), typeof message === "string" ? message : t("booking.error.title"));
    } finally {
      setLoading(false);
    }
  };

  if (!listingId) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}> 
        <Text style={[styles.emptyText, { color: colors.text }]}>{t("booking.invalidRequest")}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.outerContainer, { backgroundColor: colors.background }]}> 
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.heading, { color: colors.text }]}>{t("booking.title")}</Text>

        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
          <ImageWithFallback sourceUri={imageUri} style={styles.summaryImage} />
          <View style={styles.summaryDetails}>
            <Text style={[styles.summaryTitle, { color: colors.text }]} numberOfLines={2}>{effectiveTitle}</Text>
            <Text style={[styles.summaryPrice, { color: colors.primary }]}>{`ETB ${Number(effectivePricePerDay || 0).toLocaleString()} ${t("booking.perDaySuffix")}`}</Text>
            {propertyLoading && (
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t("booking.loadingDetails")}</Text>
            )}
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t("booking.bookingDates")}</Text>

          <View style={[styles.dateInput, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}> 
            <Text style={[styles.inputLabel, { color: colors.text }]}>{t("booking.startDate")}</Text>
            <TouchableOpacity
              style={[styles.dateButton, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}
              onPress={() => setStartPickerOpen(true)}
            >
              <Text style={[styles.dateButtonText, { color: startDate ? colors.text : colors.placeholder }]}> 
                {startDate ? formatDisplayDate(startDate) : t("booking.selectDate")}
              </Text>
            </TouchableOpacity>
            {startDateError ? <Text style={styles.validationError}>{startDateError}</Text> : null}
          </View>

          <View style={[styles.dateInput, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}> 
            <Text style={[styles.inputLabel, { color: colors.text }]}>{t("booking.endDate")}</Text>
            <TouchableOpacity
              style={[styles.dateButton, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}
              onPress={() => setEndPickerOpen(true)}
            >
              <Text style={[styles.dateButtonText, { color: endDate ? colors.text : colors.placeholder }]}> 
                {endDate ? formatDisplayDate(endDate) : t("booking.selectDate")}
              </Text>
            </TouchableOpacity>
            {endDateError ? <Text style={styles.validationError}>{endDateError}</Text> : null}
          </View>

          {dateRangeError ? <Text style={styles.validationError}>{dateRangeError}</Text> : null}

          {isStartPickerOpen && (
            <DateTimePicker
              value={startDate || new Date()}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "calendar"}
              minimumDate={new Date()}
              onChange={(event, selectedDate) => {
                setStartPickerOpen(false);
                if (!selectedDate) return;
                const chosen = new Date(selectedDate);
                setStartDate(chosen);
                if (endDate && getMidnight(chosen) >= getMidnight(endDate)) {
                  setEndDate(null);
                }
              }}
            />
          )}

          {isEndPickerOpen && (
            <DateTimePicker
              value={endDate || (startDate ? new Date(getMidnight(startDate).getTime() + MS_PER_DAY) : new Date())}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "calendar"}
              minimumDate={startDate ? new Date(getMidnight(startDate).getTime() + MS_PER_DAY) : new Date()}
              onChange={(event, selectedDate) => {
                setEndPickerOpen(false);
                if (!selectedDate) return;
                setEndDate(new Date(selectedDate));
              }}
            />
          )}
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t("booking.priceSummary")}</Text>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t("booking.totalDays")}</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{totalDays || "-"}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t("booking.pricePerDay")}</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{`ETB ${Number(effectivePricePerDay || 0).toLocaleString()}`}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t("booking.totalPrice")}</Text>
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
            <Text style={[styles.submitText, { color: canSubmit ? colors.surface : colors.textSecondary }]}>{t("booking.bookNow")}</Text>
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
  dateButton: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 16,
    justifyContent: "center",
  },
  dateButtonText: {
    fontSize: 16,
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
  emptyText: {
    fontSize: 16,
    textAlign: "center",
  },
});