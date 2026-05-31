import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  TouchableOpacity,
  Image,
  Platform,
} from "react-native";
import { useRoute, useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import useTheme from "../../hooks/useTheme";
import { initiatePayment, getPaymentByBooking, verifyPaymentByTxRef } from "../../api/paymentApi";
import { getListingBySlug } from "../../api/listingApi";
import { formatETB, formatDate } from "../../utils/formatters";
import { getImageSourceForListing, getOwnerField } from "../../utils/dataHelpers";
import ImageWithFallback from "../../components/ImageWithFallback";

// ---------------------------------------------------------------------------
// Status config — single source of truth for colors and labels
// ---------------------------------------------------------------------------
const STATUS_CONFIG = {
  pending:   { bg: "#fef3c7", text: "#92400e", dot: "#f59e0b", label: "payment.status.pending"   },
  approved:  { bg: "#dcfce7", text: "#14532d", dot: "#22c55e", label: "payment.status.approved"  },
  rejected:  { bg: "#fee2e2", text: "#7f1d1d", dot: "#ef4444", label: "payment.status.rejected"  },
  completed: { bg: "#dbeafe", text: "#1e3a5f", dot: "#2563eb", label: "payment.status.completed" },
  paid:      { bg: "#dbeafe", text: "#1e3a5f", dot: "#2563eb", label: "payment.status.paid"      },
};
const getStatusConfig = (key) => STATUS_CONFIG[key] || { bg: "#f3f4f6", text: "#6b7280", dot: "#9ca3af", label: key || "—" };

// ---------------------------------------------------------------------------
// Small reusable row — used throughout the detail sections
// ---------------------------------------------------------------------------
const InfoRow = ({ label, value, bold }) => (
  <View style={infoRowStyles.row}>
    <Text style={infoRowStyles.label}>{label}</Text>
    <Text style={[infoRowStyles.value, bold && infoRowStyles.bold]}>{value}</Text>
  </View>
);
const infoRowStyles = StyleSheet.create({
  row:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#f0f0f0" },
  label: { fontSize: 14, color: "#6b7280", flex: 1 },
  value: { fontSize: 14, color: "#111827", flex: 1, textAlign: "right" },
  bold:  { fontWeight: "800", fontSize: 16, color: "#111827" },
});

// ---------------------------------------------------------------------------
// Section card wrapper
// ---------------------------------------------------------------------------
const Section = ({ title, icon, children }) => (
  <View style={sectionStyles.card}>
    <View style={sectionStyles.header}>
      <Text style={sectionStyles.icon}>{icon}</Text>
      <Text style={sectionStyles.title}>{title}</Text>
    </View>
    {children}
  </View>
);
const sectionStyles = StyleSheet.create({
  card:   { backgroundColor: "#fff", borderRadius: 20, padding: 20, marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#f0f0f0" },
  icon:   { fontSize: 18, marginRight: 10 },
  title:  { fontSize: 16, fontWeight: "800", color: "#111827", letterSpacing: 0.2 },
});

export default function PaymentScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const route = useRoute();
  const [loading, setLoading]                   = useState(true);
  const [error, setError]                       = useState(null);
  const [paymentLoading, setPaymentLoading]     = useState(false);
  const [refreshingPayment, setRefreshingPayment] = useState(false);
  const [payment, setPayment]                   = useState(null);
  const [listing, setListing]                   = useState(null);

  const { booking } = route.params || {};

  // --- Fetch listing (unchanged logic) ---
  useEffect(() => {
    let isMounted = true;
    async function fetchListing() {
      const listingKey =
        booking?.listing_slug ||
        booking?.listing?.slug ||
        booking?.property_slug ||
        booking?.slug ||
        booking?.listing_id ||
        booking?.property_id ||
        booking?.listing?.id ||
        booking?.property?.id ||
        booking?.id;

      if (!listingKey) {
        setError(t("payment.noData"));
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await getListingBySlug(listingKey);
        if (isMounted) setListing(res.data);
      } catch (err) {
        if (isMounted)
          setError(err.response?.data?.detail || err.message || t("payment.noData"));
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchListing();
    return () => { isMounted = false; };
  }, [booking]);

  // --- Fetch payment info (unchanged logic) ---
  const fetchPaymentInfo = async () => {
    if (!booking?.id) return;
    try {
      const response = await getPaymentByBooking(booking.id);
      setPayment(response.data);
    } catch (err) {
      console.warn("Unable to load payment info:", err.response?.data || err.message || err);
    }
  };

  useFocusEffect(useCallback(() => { fetchPaymentInfo(); }, [booking]));

  // --- Pay handler (unchanged logic) ---
  const handlePayNow = async () => {
    setPaymentLoading(true);
    setError(null);
    try {
      const res = await initiatePayment({ booking_id: booking.id });
      const paymentData = res.data || {};
      setPayment(paymentData);
      const { checkout_url } = paymentData;
      if (checkout_url) {
        Linking.openURL(checkout_url);
        Alert.alert(t("payment.payAlert.continueTitle"), t("payment.payAlert.continueMessage"));
      } else if (["paid", "completed"].includes(paymentData?.status?.toLowerCase())) {
        Alert.alert(t("payment.payAlert.completeTitle"), t("payment.payAlert.completeMessage"));
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      const errMsg = error.response?.data?.detail || error.message || t("payment.payAlert.failedTitle");
      setError(errMsg);
      Alert.alert(t("payment.payAlert.failedTitle"), errMsg);
    } finally {
      setPaymentLoading(false);
    }
  };

  // --- Verify handler (unchanged logic) ---
  const handleVerifyPayment = async () => {
    if (!payment?.transaction_ref) {
      Alert.alert(t("payment.verifyAlert.noRef"), t("payment.verifyAlert.noRefMessage"));
      return;
    }
    setRefreshingPayment(true);
    setError(null);
    try {
      const response = await verifyPaymentByTxRef(payment.transaction_ref);
      const paymentData = response.data;
      setPayment(paymentData);
      const normalizedStatus = String(paymentData?.status || "").toLowerCase();
      if (["paid", "completed"].includes(normalizedStatus)) {
        Alert.alert(t("payment.verifyAlert.verified"), t("payment.verifyAlert.verifiedMessage"));
      } else {
        Alert.alert(
        t("payment.verifyAlert.statusTitle"),
        t("payment.verifyAlert.statusMessage", {
          status: paymentData.status || t("payment.verifyAlert.unknown"),
        })
      );
      }
    } catch (err) {
      const errMsg = err.response?.data?.detail || err.message || "Unable to verify payment.";
      setError(errMsg);
      Alert.alert(t("payment.verifyAlert.errorTitle"), errMsg);
    } finally {
      setRefreshingPayment(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Loading screen
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>{t("payment.loading")}</Text>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Guard — booking is required; listing may still be null (show gracefully)
  // ---------------------------------------------------------------------------
  if (!booking) {
    return (
      <View style={styles.loadingScreen}>
        <Text style={styles.errorBig}>{t("payment.noData")}</Text>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Derived values (unchanged calculation logic, fixed crash-safety)
  // ---------------------------------------------------------------------------
  const bookingStatus    = String(booking?.status || "").toLowerCase();
  const paymentStatusText = String(payment?.status || "").toLowerCase();
  const statusKey        = paymentStatusText || bookingStatus;
  const statusCfg        = getStatusConfig(statusKey);

  const canPay           = bookingStatus === "approved" && !["paid", "completed"].includes(paymentStatusText);
  const canRefreshPayment = !!payment?.transaction_ref && !["paid", "completed"].includes(paymentStatusText);
  const isPaid           = ["paid", "completed"].includes(paymentStatusText);

  const pricePerDay = Number(
    listing?.price_per_day || listing?.price_per_month || listing?.price ||
    listing?.rental_price  || booking?.price_per_day   || booking?.price || 0
  );

  const startDate = booking?.start_date ? new Date(booking.start_date) : null;
  const endDate   = booking?.end_date   ? new Date(booking.end_date)   : null;
  const totalDays = (startDate && endDate)
    ? Math.max(1, Math.round((endDate - startDate) / 86400000))
    : 1;

  let rentalCost = Number(
    payment?.rental_cost || payment?.amount || payment?.rent_amount ||
    booking?.total_cost  || booking?.amount || 0
  );
  if (!rentalCost) rentalCost = pricePerDay * totalDays || 0;

  let depositAmount = Number(
    payment?.deposit_amount || payment?.security_deposit ||
    booking?.deposit_amount || booking?.deposit || booking?.security_deposit || 0
  );
  if (!depositAmount) depositAmount = Math.round(rentalCost * 0.20);

  let platformFee = Number(
    payment?.platform_fee || payment?.fee || payment?.commission ||
    booking?.platform_fee || 0
  );
  if (!platformFee) platformFee = Math.round(rentalCost * 0.10);

  let totalPayment = Number(
    payment?.total_amount || payment?.total || payment?.grand_total ||
    booking?.total_amount || 0
  );
  if (!totalPayment) totalPayment = rentalCost + depositAmount + platformFee;

  const subtotal   = rentalCost    || 0;
  const deposit    = depositAmount || Math.round(subtotal * 0.20);
  const commission = platformFee   || Math.round(subtotal * 0.10);
  const total      = totalPayment  || (subtotal + deposit + commission);

  console.log("DEBUG PAYMENT:", { pricePerDay, totalDays, subtotal, deposit, commission, total });

  const listingSource = listing || booking?.listing || booking?.property || booking;
  const propertyImageSource = getImageSourceForListing(listingSource);
  const ownerName  = getOwnerField(listingSource, "full_name");
  const ownerPhone = getOwnerField(listingSource, "phone");
  const ownerEmail = getOwnerField(listingSource, "email");

  // ---------------------------------------------------------------------------
  // UI
  // ---------------------------------------------------------------------------
  return (
    <View style={styles.screen}>
      {/* ── Header bar ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t("payment.title")}</Text>
        <View style={[styles.statusPill, { backgroundColor: statusCfg.bg }]}>
          <View style={[styles.statusDot, { backgroundColor: statusCfg.dot }]} />
          <Text style={[styles.statusPillText, { color: statusCfg.text }]}>
            {statusCfg.label ? t(statusCfg.label) : booking.status || "—"}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Property card ── */}
        <Section title={t("payment.property")} icon="🏠">
          <View style={styles.propertyRow}>
            {propertyImageSource ? (
              <ImageWithFallback sourceObj={propertyImageSource} style={styles.propertyThumb} />
            ) : (
              <View style={[styles.propertyThumb, styles.thumbPlaceholder]}>
                <Text style={styles.thumbPlaceholderText}>🏠</Text>
              </View>
            )}
            <View style={styles.propertyMeta}>
              <Text style={styles.propertyTitle} numberOfLines={2}>
                {listing?.title || t("payment.property")}
              </Text>
              <Text style={styles.propertyCity}>{listing?.city || "—"}</Text>
              <View style={styles.ownerChip}>
                <Text style={styles.ownerChipText}>👤 {ownerName || "—"}</Text>
              </View>
              {!!ownerPhone && <Text style={styles.ownerContact}>📞 {ownerPhone}</Text>}
              {!!ownerEmail && <Text style={styles.ownerContact}>✉️ {ownerEmail}</Text>}
            </View>
          </View>
        </Section>

        {/* ── Booking details ── */}
        <Section title={t("payment.bookingDetails")} icon="📋">
          <InfoRow label={t("payment.bookingId")}      value={booking.id ? `…${String(booking.id).slice(-8)}` : "—"} />
          <InfoRow label={t("payment.checkIn")}        value={formatDate(booking.start_date)} />
          <InfoRow label={t("payment.checkOut")}       value={formatDate(booking.end_date)} />
          <InfoRow label={t("payment.duration")}        value={`${totalDays} ${totalDays !== 1 ? t("payment.days") : t("payment.day")}`} />
          <View style={[infoRowStyles.row, { borderBottomWidth: 0 }]}>
            <Text style={infoRowStyles.label}>{t("payment.bookingStatus")}</Text>
            <View style={[styles.inlinePill, { backgroundColor: statusCfg.bg }]}>
              <Text style={[styles.inlinePillText, { color: statusCfg.text }]}>
                {booking.status || "—"}
              </Text>
            </View>
          </View>
        </Section>

        {/* ── Payment summary ── */}
        <Section title={t("payment.paymentSummary")} icon="💳">
          <InfoRow label={t("payment.rentalCost")}      value={formatETB(subtotal)} />
          <InfoRow label={t("payment.securityDeposit")} value={formatETB(deposit)} />
          <InfoRow label={t("payment.platformFee")}     value={formatETB(commission)} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t("payment.totalDue")}</Text>
            <Text style={styles.totalValue}>{formatETB(total)}</Text>
          </View>
        </Section>

        {/* ── Payment method ── */}
        <Section title={t("payment.paymentMethod")} icon="🔐">
          <View style={styles.chapaRow}>
            <Image
              source={require("../../../assets/images/chapa-logo.jpg")}
              style={styles.chapaLogo}
              resizeMode="contain"
            />
            <View style={styles.chapaInfo}>
              <Text style={styles.chapaTitle}>{t("payment.chapaTitle")}</Text>
              <Text style={styles.chapaSub}>{t("payment.chapaSub")}</Text>
            </View>
            <View style={styles.secureTag}>
              <Text style={styles.secureTagText}>🔒 {t("payment.secure")}</Text>
            </View>
          </View>
          <View style={styles.protectionBanner}>
            <Text style={styles.protectionText}>
              🛡️  {t("payment.protection")}
            </Text>
          </View>
        </Section>

        {/* ── Status banners ── */}
        {bookingStatus === "pending" && (
          <View style={[styles.banner, styles.bannerWarning]}>
            <Text style={styles.bannerIcon}>⏳</Text>
            <Text style={styles.bannerText}>{t("payment.pendingBanner")}</Text>
          </View>
        )}
        {bookingStatus === "rejected" && (
          <View style={[styles.banner, styles.bannerDanger]}>
            <Text style={styles.bannerIcon}>✖</Text>
            <Text style={styles.bannerText}>{t("payment.rejectedBanner")}</Text>
          </View>
        )}
        {isPaid && (
          <View style={[styles.banner, styles.bannerSuccess]}>
            <Text style={styles.bannerIcon}>✓</Text>
            <Text style={styles.bannerText}>{t("payment.successBanner")}</Text>
          </View>
        )}
        {bookingStatus === "approved" && !isPaid && (
          <View style={[styles.banner, styles.bannerInfo]}>
            <Text style={styles.bannerIcon}>ℹ</Text>
            <Text style={styles.bannerText}>{t("payment.approvedBanner")}</Text>
          </View>
        )}

        {/* ── Error message ── */}
        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️  {error}</Text>
          </View>
        )}

        {/* ── Action buttons ── */}
        {canPay && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handlePayNow}
            disabled={paymentLoading}
            activeOpacity={0.85}
          >
            {paymentLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.primaryButtonText}>{t("payment.continueButton")}</Text>
                <Text style={styles.primaryButtonSub}>{t("payment.continueSubtitle")}</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {canRefreshPayment && (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleVerifyPayment}
            disabled={refreshingPayment}
            activeOpacity={0.85}
          >
            {refreshingPayment ? (
              <ActivityIndicator color="#2563eb" />
            ) : (
              <Text style={styles.secondaryButtonText}>{t("payment.refreshButton")}</Text>
            )}
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

  // Header
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
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusPillText: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "capitalize",
  },

  // Scroll
  scroll: {
    padding: 16,
    paddingTop: 20,
  },

  // Loading
  loadingScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fb",
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: "#6b7280",
    marginTop: 12,
  },
  errorBig: {
    fontSize: 16,
    color: "#6b7280",
  },

  // Property section
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
  thumbPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  thumbPlaceholderText: {
    fontSize: 28,
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
  ownerChip: {
    alignSelf: "flex-start",
    backgroundColor: "#eff6ff",
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginTop: 4,
  },
  ownerChipText: {
    fontSize: 12,
    color: "#2563eb",
    fontWeight: "600",
  },
  ownerContact: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },

  // Inline status pill (booking details row)
  inlinePill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  inlinePillText: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "capitalize",
  },

  // Total row
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 14,
    borderTopWidth: 2,
    borderTopColor: "#f0f0f0",
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  totalValue: {
    fontSize: 20,
    fontWeight: "900",
    color: "#2563eb",
  },

  // Chapa section
  chapaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
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
  secureTag: {
    backgroundColor: "#f0fdf4",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  secureTagText: {
    fontSize: 12,
    color: "#16a34a",
    fontWeight: "700",
  },
  protectionBanner: {
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    padding: 12,
  },
  protectionText: {
    fontSize: 13,
    color: "#1d4ed8",
    lineHeight: 18,
  },

  // Status banners
  banner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    gap: 10,
  },
  bannerWarning: { backgroundColor: "#fef3c7" },
  bannerDanger:  { backgroundColor: "#fee2e2" },
  bannerSuccess: { backgroundColor: "#dcfce7" },
  bannerInfo:    { backgroundColor: "#dbeafe" },
  bannerIcon: {
    fontSize: 18,
  },
  bannerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    lineHeight: 20,
  },

  // Error box
  errorBox: {
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  errorText: {
    color: "#b91c1c",
    fontSize: 14,
    lineHeight: 20,
  },

  // Buttons
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
    letterSpacing: 0.2,
  },
  primaryButtonSub: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    marginTop: 3,
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