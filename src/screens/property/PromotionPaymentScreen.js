import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Image,
  Linking,
  Platform,
} from "react-native";
import { useRoute, useFocusEffect } from "@react-navigation/native";
import useTheme from "../../hooks/useTheme";
import { getPropertyById, promoteListing } from "../../api/propertyApi";
import { verifyPaymentByTxRef } from "../../api/paymentApi";
import { getPrimaryImageUrl } from "../../utils/dataHelpers";
import { formatETB, formatDate } from "../../utils/formatters";
import ImageWithFallback from "../../components/ImageWithFallback";
import AsyncStorage from "@react-native-async-storage/async-storage";

const benefitItems = [
  "⭐ Featured Badge",
  "Higher Visibility",
  "Appears Before Normal Listings",
  "Better Exposure To Customers",
];

const getStatusLabel = (status) => {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "pending") return "Pending";
  if (normalized === "paid") return "Paid";
  if (normalized === "completed") return "Completed";
  if (normalized === "featured") return "Featured";
  if (!status) return "Not started";
  return status;
};

const findNestedValue = (obj, matchKeys) => {
  if (!obj || typeof obj !== "object") return null;
  for (const key of Object.keys(obj)) {
    if (matchKeys.includes(key)) return obj[key];
  }
  for (const key of Object.keys(obj)) {
    const child = obj[key];
    if (typeof child === "object") {
      const found = findNestedValue(child, matchKeys);
      if (found != null) return found;
    }
  }
  return null;
};

const extractTxRef = (paymentData) => {
  if (!paymentData) return null;
  return (
    paymentData.transaction_ref ||
    paymentData.tx_ref ||
    paymentData.transactionRef ||
    paymentData.txRef ||
    paymentData.payment_reference ||
    paymentData.paymentReference ||
    paymentData.reference ||
    paymentData.payment_id ||
    paymentData.paymentId ||
    findNestedValue(paymentData, [
      "transaction_ref",
      "tx_ref",
      "transactionRef",
      "txRef",
      "payment_reference",
      "paymentReference",
      "reference",
      "payment_id",
      "paymentId",
    ]) ||
    null
  );
};

const extractCheckoutUrl = (paymentData) => {
  if (!paymentData) return null;
  return (
    paymentData.checkout_url ||
    paymentData.checkoutUrl ||
    paymentData.checkout ||
    paymentData.payment_url ||
    paymentData.paymentUrl ||
    paymentData.url ||
    findNestedValue(paymentData, ["checkout_url", "checkoutUrl", "checkout", "payment_url", "paymentUrl", "url"]) ||
    null
  );
};

const PROMOTION_PAYMENTS_KEY = "promotion_payments";

const normalizePaymentData = (paymentData) => {
  const txRef = extractTxRef(paymentData);
  const checkoutUrl = extractCheckoutUrl(paymentData);
  return {
    ...paymentData,
    transaction_ref: txRef,
    tx_ref: txRef,
    checkout_url: checkoutUrl,
    checkoutUrl,
    status: paymentData.status || paymentData.payment_status || paymentData.state || paymentData.status_text || paymentData.current_status || paymentData.transaction?.status || paymentData.transaction?.state || paymentData.transaction?.status_text || paymentData.transaction?.current_status || paymentData.status,
  };
};

const loadPromotionPayments = async () => {
  try {
    const raw = await AsyncStorage.getItem(PROMOTION_PAYMENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn("Failed to load promotion payments", err);
    return [];
  }
};

const savePromotionPayments = async (items) => {
  try {
    await AsyncStorage.setItem(PROMOTION_PAYMENTS_KEY, JSON.stringify(items || []));
  } catch (err) {
    console.warn("Failed to save promotion payments", err);
  }
};

export default function PromotionPaymentScreen() {
  const route = useRoute();
  const { listing, listing_id } = route.params || {};
  const { colors } = useTheme();

  const [selectedDuration, setSelectedDuration] = useState(7);
  const [loading, setLoading] = useState(false);
  const [refreshingPayment, setRefreshingPayment] = useState(false);
  const [error, setError] = useState(null);
  const [payment, setPayment] = useState(null);
  const [listingState, setListingState] = useState(listing || null);

  const propertyId = listing_id || listing?.id;

  const fetchListing = useCallback(async () => {
    if (!propertyId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await getPropertyById(propertyId);
      setListingState(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || "Unable to load property information.");
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    fetchListing();
  }, [fetchListing]);

  const propertyTitle = listingState?.title || listingState?.name || "Untitled Property";
  const propertyLocation = listingState?.location || listingState?.city || listingState?.address || "Unknown location";
  const propertyImageUrl = getPrimaryImageUrl(listingState) || "";
  const featuredUntilLabel = listingState?.featured_until ? formatDate(listingState.featured_until) : "—";
  const isCurrentlyFeatured = Boolean(listingState?.is_featured) && (!listingState?.featured_until || new Date(listingState.featured_until) > new Date());

  const paymentStatus = String(payment?.status || "").toLowerCase();
  const currentStatus = paymentStatus || (isCurrentlyFeatured ? "featured" : "pending");
  const transactionRef = payment?.transaction_ref || payment?.tx_ref || payment?.transactionRef || null;
  const canPay = !isCurrentlyFeatured && !["paid", "completed"].includes(paymentStatus);
  const canRefreshPayment = !!transactionRef && !["paid", "completed"].includes(paymentStatus);

  const getPendingPromotion = useCallback(async () => {
    if (!propertyId) return null;
    const all = await loadPromotionPayments();
    return all.find((item) => String(item.listing_id) === String(propertyId));
  }, [propertyId]);

  const savePendingPromotion = useCallback(async (entry) => {
    if (!propertyId) return;
    const all = await loadPromotionPayments();
    const next = all.filter((item) => String(item.listing_id) !== String(propertyId));
    next.push(entry);
    await savePromotionPayments(next);
  }, [propertyId]);

  const removePendingPromotion = useCallback(async () => {
    if (!propertyId) return;
    const all = await loadPromotionPayments();
    const next = all.filter((item) => String(item.listing_id) !== String(propertyId));
    await savePromotionPayments(next);
  }, [propertyId]);

  const verifyPendingStatus = useCallback(async (txRef, showAlerts = true) => {
    if (!txRef) return null;
    setRefreshingPayment(true);
    setError(null);
    try {
      const response = await verifyPaymentByTxRef(txRef);
      const rawPaymentData = response.data?.data || response.data || {};
      const normalizedPaymentData = normalizePaymentData(rawPaymentData);
      const status = String(normalizedPaymentData.status || "").toLowerCase();
      setPayment(normalizedPaymentData);

      console.log("PROMOTION PAYMENT VERIFY RESPONSE", { rawResponse: response.data, normalizedPaymentData, status });

      if (["paid", "completed"].includes(status)) {
        await removePendingPromotion();
        await fetchListing();
        if (showAlerts) {
          Alert.alert("Promotion Successful", "Your listing is now featured.");
        }
      } else if (showAlerts) {
        Alert.alert("Payment Status", `Current status: ${getStatusLabel(status)}.`);
      }
      return normalizedPaymentData;
    } catch (err) {
      const message = err.response?.data?.detail || err.message || "Unable to verify payment.";
      setError(message);
      console.log("PROMOTION PAYMENT VERIFY FAILED", { error: err, response: err.response?.data });
      if (showAlerts) {
        Alert.alert("Verification failed", message);
      }
      return null;
    } finally {
      setRefreshingPayment(false);
    }
  }, [fetchListing, removePendingPromotion]);

  const loadPendingData = useCallback(async () => {
    if (!propertyId) return;
    const pending = await getPendingPromotion();
    if (!pending) return;
    setPayment(normalizePaymentData(pending.payment || pending));
    setError(null);
    if (!["paid", "completed"].includes(String(pending.status || "pending").toLowerCase())) {
      await verifyPendingStatus(pending.transaction_ref || pending.tx_ref);
    }
  }, [getPendingPromotion, propertyId, verifyPendingStatus]);

  useFocusEffect(
    useCallback(() => {
      loadPendingData();
    }, [loadPendingData])
  );

  const handlePayNow = async () => {
    if (!propertyId) {
      Alert.alert("Missing property", "Unable to start promotion without a valid property.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await promoteListing(propertyId, selectedDuration);
      const rawPaymentData = response.data?.data || response.data || {};
      const normalizedPaymentData = normalizePaymentData(rawPaymentData);
      const status = String(normalizedPaymentData.status || "pending").toLowerCase();
      const txRef = normalizedPaymentData.transaction_ref;
      const url = normalizedPaymentData.checkout_url;

      console.log("PROMOTION PAYMENT CREATED", {
        rawResponse: response.data,
        normalizedPaymentData,
        txRef,
        checkoutUrl: url,
        status,
      });

      setPayment(normalizedPaymentData);

      if (!txRef) {
        const message = "Promotion payment response did not include a valid transaction reference (tx_ref).";
        setError(message);
        Alert.alert("Missing transaction reference", message);
        return;
      }

      await savePendingPromotion({
        listing_id: propertyId,
        transaction_ref: txRef,
        tx_ref: txRef,
        checkout_url: url,
        duration_days: selectedDuration,
        status,
        created_at: new Date().toISOString(),
        payment: normalizedPaymentData,
      });

      if (url) {
        await Linking.openURL(url);
        Alert.alert("Continue to Chapa", "Complete your payment in Chapa and return to the app.");
      } else if (["paid", "completed"].includes(status)) {
        Alert.alert("Payment Complete", "Your promotion has been completed successfully.");
        await fetchListing();
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err) {
      const message = err.response?.data?.detail || err.message || "Unable to start promotion payment.";
      setError(message);
      console.log("PROMOTION PAYMENT FAILED", { error: err, response: err.response?.data });
      Alert.alert("Payment failed", message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshStatus = async () => {
    const verifyTxRef = transactionRef || extractTxRef(payment);
    if (!verifyTxRef) {
      const message = "Cannot verify payment because no transaction reference is available.";
      setError(message);
      Alert.alert("Missing transaction reference", message);
      console.log("PROMOTION PAYMENT VERIFY SKIPPED", { payment, transactionRef, verifyTxRef });
      return;
    }

    console.log("VERIFYING PROMOTION PAYMENT", { verifyTxRef });
    await verifyPendingStatus(verifyTxRef);
  };

  if (loading && !listingState) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}> 
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={[styles.errorText, { color: colors.text, marginTop: 16 }]}>Loading promotion details...</Text>
      </View>
    );
  }

  if (!propertyId) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}> 
        <Text style={[styles.errorText, { color: colors.text }]}>Unable to load property information.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}> 
      <View style={[styles.header, { backgroundColor: colors.surface }]}> 
        <Text style={[styles.headerTitle, { color: colors.text }]}>Promotion Payment</Text>
        <Text style={[styles.statusPillText, { color: colors.primary }]}> {getStatusLabel(currentStatus)} </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.section, { backgroundColor: colors.surface }]}> 
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Property Information</Text>
          <View style={styles.propertyRow}>
            <ImageWithFallback sourceUri={propertyImageUrl} style={styles.propertyThumb} />
            <View style={styles.propertyMeta}>
              <Text style={[styles.propertyTitle, { color: colors.text }]} numberOfLines={2}>{propertyTitle}</Text>
              <Text style={[styles.propertyCity, { color: colors.textSecondary }]}>{propertyLocation}</Text>
              {isCurrentlyFeatured && (
                <View style={styles.featuredInfo}>
                  <Text style={styles.featuredInfoText}>⭐ Featured Until: {featuredUntilLabel}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface }]}> 
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Promotion Information</Text>
          <View style={styles.durationRow}>
            {[7, 14, 30].map((days) => (
              <TouchableOpacity
                key={days}
                style={[
                  styles.durationButton,
                  selectedDuration === days ? styles.durationButtonActive : null,
                ]}
                onPress={() => setSelectedDuration(days)}
                activeOpacity={0.85}
              >
                <Text style={[styles.durationButtonText, selectedDuration === days ? styles.durationButtonTextActive : null]}>{days} Days</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.infoRow}> 
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Duration</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{selectedDuration} days</Text>
          </View>
          <View style={styles.infoRow}> 
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Promotion Cost</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{payment?.amount ? formatETB(Number(payment.amount)) : "TBD"}</Text>
          </View>
          <View style={styles.infoRow}> 
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Current Promotion Status</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{getStatusLabel(currentStatus)}</Text>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface }]}> 
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Benefits</Text>
          {benefitItems.map((item) => (
            <View key={item} style={styles.benefitRow}>
              <Text style={styles.benefitDot}>✓</Text>
              <Text style={[styles.benefitText, { color: colors.text }]}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface }]}> 
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Chapa Payment</Text>
          <View style={styles.chapaRow}>
            <Image source={require("../../../assets/images/chapa-logo.jpg")} style={styles.chapaLogo} resizeMode="contain" />
            <View style={styles.chapaInfo}>
              <Text style={[styles.chapaTitle, { color: colors.text }]}>Pay securely with Chapa</Text>
              <Text style={[styles.chapaSub, { color: colors.textSecondary }]}>Fast and safe payment processing.</Text>
            </View>
          </View>
        </View>

        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {canPay && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handlePayNow}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Continue To Chapa Payment</Text>
            )}
          </TouchableOpacity>
        )}

        {canRefreshPayment && (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleRefreshStatus}
            disabled={refreshingPayment}
            activeOpacity={0.85}
          >
            {refreshingPayment ? <ActivityIndicator color="#2563eb" /> : <Text style={styles.secondaryButtonText}>Refresh Payment Status</Text>}
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f8f9fb",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 56 : 24,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111827",
    letterSpacing: -0.5,
  },
  statusPillText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563eb",
  },
  scroll: {
    padding: 16,
    paddingTop: 20,
  },
  section: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 16,
  },
  propertyRow: {
    flexDirection: "row",
    gap: 14,
  },
  propertyThumb: {
    width: 88,
    height: 88,
    borderRadius: 14,
    backgroundColor: "#f3f4f6",
  },
  propertyMeta: {
    flex: 1,
    justifyContent: "center",
    gap: 4,
  },
  propertyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    lineHeight: 20,
  },
  propertyCity: {
    fontSize: 13,
    color: "#6b7280",
  },
  featuredInfo: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "#fffbeb",
  },
  featuredInfoText: {
    fontSize: 12,
    color: "#b45309",
    fontWeight: "700",
  },
  durationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  durationButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 14,
    paddingVertical: 14,
    marginRight: 10,
    backgroundColor: "#fff",
    alignItems: "center",
  },
  durationButtonActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  durationButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  durationButtonTextActive: {
    color: "#fff",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  infoLabel: {
    fontSize: 14,
    color: "#6b7280",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  benefitDot: {
    fontSize: 16,
    marginRight: 10,
    color: "#2563eb",
  },
  benefitText: {
    fontSize: 14,
    color: "#111827",
    flex: 1,
  },
  chapaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  chapaLogo: {
    width: 56,
    height: 28,
    borderRadius: 6,
  },
  chapaInfo: {
    flex: 1,
  },
  chapaTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  chapaSub: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 1,
  },
  errorBox: {
    backgroundColor: "#fee2e2",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  errorText: {
    color: "#991b1b",
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: "#2563eb",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryButton: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: "#2563eb",
  },
  secondaryButtonText: {
    color: "#2563eb",
    fontSize: 15,
    fontWeight: "700",
  },
});
