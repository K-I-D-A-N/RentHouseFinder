
import React, { useState, useEffect, useCallback } from "react";
import { View, Text, Image, StyleSheet, ScrollView, ActivityIndicator, Alert, Linking, TouchableOpacity } from "react-native";
import { useRoute, useFocusEffect } from "@react-navigation/native";
import useTheme from "../../hooks/useTheme";
import { initiatePayment, getPaymentByBooking, verifyPaymentByTxRef } from "../../api/paymentApi";
import { getListingBySlug } from "../../api/listingApi";
import { formatETB, formatDate } from "../../utils/formatters";
import { getImageSourceForListing, getOwnerField } from "../../utils/dataHelpers";
import ImageWithFallback from "../../components/ImageWithFallback";


export default function PaymentScreen() {
  const { colors } = useTheme();
  const route = useRoute();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [refreshingPayment, setRefreshingPayment] = useState(false);
  const [payment, setPayment] = useState(null);
  const [listing, setListing] = useState(null);

  // Booking info passed via route params
  const { booking } = route.params || {};
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
        setError('Missing listing information.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await getListingBySlug(listingKey);
        if (isMounted) {
          setListing(res.data);
        }
      } catch (err) {
        setError(
          err.response?.data?.detail ||
            err.message ||
            'Failed to load property details.'
        );
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchListing();
    return () => {
      isMounted = false;
    };
  }, [booking]);

  const fetchPaymentInfo = async () => {
    if (!booking?.id) return;
    try {
      const response = await getPaymentByBooking(booking.id);
      const paymentData = response.data;
      setPayment(paymentData);
    } catch (err) {
      console.warn(
        "Unable to load payment info:",
        err.response?.data || err.message || err
      );
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchPaymentInfo();
    }, [booking])
  );

  // Payment handler
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
        Alert.alert('Continue Payment', 'Complete your payment in the opened window. After payment, return to this app.');
      } else if (paymentData?.status?.toLowerCase() === 'paid' || paymentData?.status?.toLowerCase() === 'completed') {
        Alert.alert('Payment Complete', 'Your payment is already marked complete.');
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      const errMsg = error.response?.data?.detail || error.message || 'Payment failed';
      setError(errMsg);
      Alert.alert('Payment Failed', errMsg);
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleVerifyPayment = async () => {
    if (!payment?.transaction_ref) {
      Alert.alert('Unable to verify', 'No payment transaction reference is available yet.');
      return;
    }

    setRefreshingPayment(true);
    setError(null);
    try {
      const response = await verifyPaymentByTxRef(payment.transaction_ref);
      const paymentData = response.data;
      setPayment(paymentData);

      const normalizedStatus = String(paymentData?.status || '').toLowerCase();
      if (normalizedStatus === 'paid' || normalizedStatus === 'completed') {
        Alert.alert('Payment Verified', 'The payment is now complete.');
      } else {
        Alert.alert('Payment Status', `Current status: ${paymentData.status || 'unknown'}`);
      }
    } catch (err) {
      const errMsg = err.response?.data?.detail || err.message || 'Unable to verify payment.';
      setError(errMsg);
      Alert.alert('Verification Error', errMsg);
    } finally {
      setRefreshingPayment(false);
    }
  };

  // Status badge color
  const statusColors = {
    pending: '#f59e42',
    approved: '#22c55e',
    rejected: '#ef4444',
    completed: '#2563eb',
    paid: '#2563eb',
  };
  const bookingStatus = booking.status?.toLowerCase() || '';
  const paymentStatusText = (payment?.status || '').toLowerCase();
  const statusKey = paymentStatusText || bookingStatus;
  const statusColor = statusColors[statusKey] || '#888';
  const statusText = statusKey;
  const canPay = bookingStatus === 'approved' && !['paid', 'completed'].includes(paymentStatusText);
  const canRefreshPayment = payment?.transaction_ref && !['paid', 'completed'].includes(paymentStatusText);

  // Loading state
  if (loading) {
    return (
      <View style={[styles.center, { flex: 1, backgroundColor: colors.background }]}> 
        <ActivityIndicator size="large" color={colors.primary || '#2563eb'} />
      </View>
    );
  }
  if (!booking || !listing) {
    return (
      <View style={[styles.center, { flex: 1, backgroundColor: colors.background }]}> 
        <Text style={{ color: colors.text }}>No booking or listing data found.</Text>
      </View>
    );
  }

  // Payment summary calculations
  const pricePerDay = Number(listing?.price_per_day || listing?.price_per_month || listing?.price || listing?.rental_price || booking?.price_per_day || booking?.price || 1000);
  // Calculate total days from booking dates
  const startDate = booking?.start_date ? new Date(booking.start_date) : null;
  const endDate = booking?.end_date ? new Date(booking.end_date) : null;
  let totalDays = 1;
  if (startDate && endDate) {
    totalDays = Math.max(1, Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)));
  }
  
  // Rental cost - try multiple sources
  let rentalCost = Number(payment?.rental_cost || payment?.amount || payment?.rent_amount || booking?.total_cost || booking?.amount || 0);
  if (!rentalCost || rentalCost === 0) {
    rentalCost = Number(pricePerDay * totalDays) || 5000;
  }
  
  // Deposit - try multiple sources, always set a value
  let depositAmount = Number(payment?.deposit_amount || payment?.security_deposit || booking?.deposit_amount || booking?.deposit || booking?.security_deposit || 0);
  if (!depositAmount || depositAmount === 0) {
    depositAmount = Math.round(rentalCost * 0.20);
  }
  
  // Commission/Platform fee
  let platformFee = Number(payment?.platform_fee || payment?.fee || payment?.commission || booking?.platform_fee || 0);
  if (!platformFee || platformFee === 0) {
    platformFee = Math.round(rentalCost * 0.10);
  }
  
  // Total - always calculate
  let totalPayment = Number(payment?.total_amount || payment?.total || payment?.grand_total || booking?.total_amount || 0);
  if (!totalPayment || totalPayment === 0) {
    totalPayment = Number(rentalCost + depositAmount + platformFee);
  }
  
  const subtotal = Number(rentalCost) || 5000;
  const deposit = Number(depositAmount) || Math.round((subtotal || 5000) * 0.20);
  const commission = Number(platformFee) || Math.round((subtotal || 5000) * 0.10);
  const total = Number(totalPayment) || (subtotal + deposit + commission);
  
  console.log('DEBUG PAYMENT:', { pricePerDay, totalDays, rentalCost, depositAmount, platformFee, totalPayment, subtotal, deposit, commission, total });

  // Fallback for property image and owner fields
  const propertyImageSource = getImageSourceForListing(listing);
  const ownerName = getOwnerField(listing, "full_name");
  const ownerPhone = getOwnerField(listing, "phone");
  const ownerEmail = getOwnerField(listing, "email");

  // Main UI
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={[styles.scrollContainer, { paddingBottom: 100 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          {/* Property Info */}
          <Text style={styles.sectionTitle}>Property Information</Text>
          <View style={styles.row}>
            <ImageWithFallback sourceObj={propertyImageSource} style={styles.propertyImage} />
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={styles.propertyTitle} numberOfLines={2}>{listing.title || '-'}</Text>
              <Text style={styles.propertyLocation}>{listing.city || '-'}</Text>
              <Text style={styles.ownerName}>Landlord: {ownerName}</Text>
              <Text style={styles.ownerName}>Phone: {ownerPhone}</Text>
              <Text style={styles.ownerName}>Email: {ownerEmail}</Text>
            </View>
          </View>
          {/* Booking Info */}
          <Text style={styles.sectionTitle}>Booking Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Booking ID:</Text>
            <Text style={styles.infoValue} numberOfLines={1} ellipsizeMode="tail">{booking.id || '-'}</Text>
          </View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Check-in:</Text><Text style={styles.infoValue}>{formatDate(booking.start_date)}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Check-out:</Text><Text style={styles.infoValue}>{formatDate(booking.end_date)}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Total Days:</Text><Text style={styles.infoValue}>{totalDays}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Booking Status:</Text><Text style={styles.infoValue}>{booking.status || '-'}</Text></View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Payment Status:</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}> 
              <Text style={styles.statusText}>{payment?.status || booking.status || '-'}</Text>
            </View>
          </View>
          {/* Payment Summary */}
          <Text style={styles.sectionTitle}>Payment Summary</Text>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Rental Cost:</Text><Text style={styles.infoValue}>{formatETB(subtotal)}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Security Deposit:</Text><Text style={styles.infoValue}>{formatETB(deposit)}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Platform Fee:</Text><Text style={styles.infoValue}>{formatETB(commission)}</Text></View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { fontWeight: 'bold', fontSize: 17 }]}>Total Payment:</Text>
            <Text style={[styles.infoValue, { fontWeight: 'bold', fontSize: 17 }]}>{formatETB(total)}</Text>
          </View>
          {/* Payment Protection Note */}
          <View style={styles.protectionBox}>
            <Text style={styles.protectionText}>Your payment is protected by BetRent until check-in is confirmed.</Text>
          </View>
          {/* Chapa Branding */}
          <View style={styles.paymentMethodSection}>
            <Image source={require("../../../assets/images/chapa-logo.jpg")} style={styles.chapaLogo} resizeMode="contain" />
            <Text style={styles.paymentMethodText}>Pay securely with Chapa</Text>
          </View>
          {/* Error Message */}
          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
        {/* Status and action messages */}
        {bookingStatus === 'pending' && (
          <View style={styles.pendingBox}>
            <Text style={styles.pendingText}>Waiting for landlord approval</Text>
          </View>
        )}
        {bookingStatus === 'rejected' && (
          <View style={styles.rejectedBox}>
            <Text style={styles.rejectedText}>Booking request rejected by the landlord.</Text>
          </View>
        )}
        {['paid', 'completed'].includes(paymentStatusText) && (
          <View style={styles.successBox}>
            <Text style={styles.successText}>Payment successful</Text>
          </View>
        )}
        {bookingStatus === 'approved' && !['paid', 'completed'].includes(paymentStatusText) && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>Your booking is approved. Complete payment to confirm your stay.</Text>
          </View>
        )}

        {/* Inline Pay Button (now scrollable) */}
        {canPay && (
          <TouchableOpacity
            style={styles.realPayButton}
            onPress={handlePayNow}
            disabled={paymentLoading}
            activeOpacity={0.8}
          >
            {paymentLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.realPayButtonText}>Continue to Chapa Payment</Text>
            )}
          </TouchableOpacity>
        )}
        {canRefreshPayment && (
          <TouchableOpacity
            style={[styles.realPayButton, styles.secondaryButton]}
            onPress={handleVerifyPayment}
            disabled={refreshingPayment}
            activeOpacity={0.8}
          >
            {refreshingPayment ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.realPayButtonText}>Refresh Payment Status</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  realPayButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  secondaryButton: {
    backgroundColor: '#1d4ed8',
    marginBottom: 10,
  },
  realPayButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
    color: "#222",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  propertyImage: {
    width: 90,
    height: 90,
    borderRadius: 12,
    backgroundColor: "#eee",
  },
  propertyTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#222",
  },
  propertyLocation: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  ownerName: {
    fontSize: 13,
    color: "#888",
    marginTop: 2,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  infoLabel: {
    color: "#444",
    fontSize: 15,
    flex: 1,
  },
  infoValue: {
    color: "#222",
    fontSize: 15,
    flex: 1,
    textAlign: "right",
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 70,
  },
  statusText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
    textTransform: "capitalize",
    textAlign: "center",
  },
  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 10,
  },
  protectionBox: {
    backgroundColor: "#f0f7ff",
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    marginBottom: 8,
  },
  protectionText: {
    color: "#2563eb",
    fontSize: 13,
    textAlign: "center",
  },
  errorText: {
    color: "#ef4444",
    marginTop: 10,
    textAlign: "center",
    fontSize: 15,
  },
  paymentMethodSection: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
    marginBottom: 8,
  },
  chapaLogo: {
    width: 60,
    height: 28,
    marginRight: 10,
  },
  paymentMethodText: {
    fontSize: 15,
    color: "#222",
  },
  successBox: {
    backgroundColor: "#e6ffed",
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
    alignItems: "center",
  },
  successText: {
    color: "#059669",
    fontWeight: "bold",
    fontSize: 16,
  },
  pendingBox: {
    backgroundColor: "#fffbe6",
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
    alignItems: "center",
  },
  pendingText: {
    color: "#b45309",
    fontWeight: "bold",
    fontSize: 16,
  },
  rejectedBox: {
    backgroundColor: "#fee2e2",
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
    alignItems: "center",
  },
  rejectedText: {
    color: "#b91c1c",
    fontWeight: "bold",
    fontSize: 16,
  },
  infoBox: {
    backgroundColor: "#eff6ff",
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  infoText: {
    color: "#1e40af",
    fontSize: 15,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
