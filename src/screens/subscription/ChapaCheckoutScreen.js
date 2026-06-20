import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import useTheme from "../../hooks/useTheme";
import useAuth from "../../hooks/useAuth";
import {
  verifyExternalPaymentStatus,
  verifyCustomerPremiumPayment,
  checkCustomerPremiumStatus,
} from "../../services/subscriptionService";

const isPaymentComplete = (result) => {
  const status = String(result?.status || result?.account_status || result?.payment_status || "").toLowerCase();
  return ["active", "success", "paid", "completed"].includes(status);
};

export default function ChapaCheckoutScreen({ route, navigation }) {
  const {
    checkout_url: checkoutUrlParam,
    tx_ref: txRefParam,
    transaction_id: transactionIdParam,
    amount,
    paymentType = "landlord_subscription",
    title,
  } = route.params || {};

  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { refreshCurrentUser, pendingCheckoutUrl, pendingTransactionId, pendingAmount } = useAuth();

  const checkoutUrl = checkoutUrlParam || pendingCheckoutUrl;
  const txRef = txRefParam || transactionIdParam || pendingTransactionId;
  const displayAmount = amount ?? pendingAmount;

  const [opening, setOpening] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [hasOpenedCheckout, setHasOpenedCheckout] = useState(false);

  const screenTitle =
    title ||
    (paymentType === "customer_premium" ? "Upgrade to Premium" : "Complete Subscription Payment");

  const openCheckout = useCallback(async () => {
    if (!checkoutUrl) {
      Alert.alert("Payment unavailable", "No checkout URL was provided.");
      return;
    }
    setOpening(true);
    try {
      await Linking.openURL(checkoutUrl);
      setHasOpenedCheckout(true);
      setStatusMessage("Complete payment in Chapa, then tap Check Payment Status.");
    } catch (error) {
      Alert.alert("Unable to open payment page", error.message || "Please try again.");
    } finally {
      setOpening(false);
    }
  }, [checkoutUrl]);

  useEffect(() => {
    if (checkoutUrl && !hasOpenedCheckout) {
      openCheckout();
    }
  }, [checkoutUrl, hasOpenedCheckout, openCheckout]);

  const handleVerifyPayment = async () => {
    if (!txRef && paymentType !== "customer_premium") {
      Alert.alert("Missing reference", "No transaction reference is available to verify.");
      return;
    }

    setVerifying(true);
    setStatusMessage("");

    try {
      let result;
      if (paymentType === "customer_premium") {
        if (txRef) {
          result = await verifyCustomerPremiumPayment(txRef);
        } else {
          result = await checkCustomerPremiumStatus();
        }
      } else {
        result = await verifyExternalPaymentStatus(txRef);
      }

      if (isPaymentComplete(result)) {
        await refreshCurrentUser?.();
        Alert.alert("Payment confirmed", "Your payment was successful.", [
          {
            text: "Continue",
            onPress: () => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.reset({ index: 0, routes: [{ name: "Main" }] });
              }
            },
          },
        ]);
        return;
      }

      const message = result?.message || result?.detail || "Payment is still processing.";
      setStatusMessage(message);
      Alert.alert("Payment pending", message);
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.detail ||
        error.message ||
        "Unable to verify payment.";
      setStatusMessage(message);
      Alert.alert("Verification failed", typeof message === "string" ? message : JSON.stringify(message));
    } finally {
      setVerifying(false);
    }
  };

  if (!checkoutUrl && !txRef) {
    return (
      <View style={styles.container}>
        <Text style={styles.header}>{screenTitle}</Text>
        <Text style={styles.subtext}>No payment session was provided.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Ionicons name="card-outline" size={64} color={colors.primary} style={styles.icon} />
      <Text style={styles.header}>{screenTitle}</Text>
      <Text style={styles.subtext}>
        Pay securely with Chapa. After completing payment, return here and check your payment status.
      </Text>

      <View style={styles.detailBox}>
        {displayAmount != null ? (
          <Text style={styles.amountText}>Amount: ETB {displayAmount}</Text>
        ) : null}
        {txRef ? (
          <>
            <Text style={styles.label}>Transaction reference</Text>
            <Text style={styles.txRef} selectable>
              {txRef}
            </Text>
          </>
        ) : null}
      </View>

      {hasOpenedCheckout ? (
        <View style={styles.processingBox}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.processingText}>Payment processing…</Text>
          <Text style={styles.processingHint}>Complete payment in your browser, then verify below.</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.primaryButton, opening && styles.buttonDisabled]}
        onPress={openCheckout}
        disabled={opening || !checkoutUrl}
      >
        {opening ? (
          <ActivityIndicator color={colors.surface} />
        ) : (
          <Text style={styles.primaryButtonText}>Pay with Chapa</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.secondaryButton, verifying && styles.buttonDisabled]}
        onPress={handleVerifyPayment}
        disabled={verifying}
      >
        {verifying ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Text style={styles.secondaryButtonText}>Check Payment Status</Text>
        )}
      </TouchableOpacity>

      {statusMessage ? <Text style={styles.statusMessage}>{statusMessage}</Text> : null}
    </ScrollView>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flexGrow: 1,
      padding: 24,
      backgroundColor: colors.background,
      justifyContent: "center",
    },
    icon: {
      alignSelf: "center",
      marginBottom: 16,
    },
    header: {
      fontSize: 24,
      fontWeight: "800",
      color: colors.text,
      marginBottom: 10,
      textAlign: "center",
    },
    subtext: {
      fontSize: 15,
      color: colors.textSecondary,
      marginBottom: 24,
      lineHeight: 22,
      textAlign: "center",
    },
    detailBox: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    label: {
      color: colors.textSecondary,
      fontSize: 12,
      marginBottom: 8,
      fontWeight: "700",
    },
    txRef: {
      color: colors.text,
      fontSize: 16,
      lineHeight: 22,
      fontWeight: "700",
    },
    amountText: {
      color: colors.primary,
      fontSize: 18,
      fontWeight: "800",
      marginBottom: 12,
    },
    processingBox: {
      alignItems: "center",
      marginBottom: 16,
      padding: 16,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    processingText: {
      marginTop: 10,
      color: colors.text,
      fontWeight: "700",
    },
    processingHint: {
      marginTop: 6,
      color: colors.textSecondary,
      fontSize: 13,
      textAlign: "center",
    },
    primaryButton: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: "center",
      marginBottom: 12,
    },
    secondaryButton: {
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.primary,
    },
    buttonDisabled: {
      opacity: 0.7,
    },
    primaryButtonText: {
      color: colors.surface,
      fontSize: 16,
      fontWeight: "700",
    },
    secondaryButtonText: {
      color: colors.primary,
      fontSize: 16,
      fontWeight: "700",
    },
    statusMessage: {
      color: colors.textSecondary,
      fontSize: 14,
      marginTop: 16,
      textAlign: "center",
    },
  });
