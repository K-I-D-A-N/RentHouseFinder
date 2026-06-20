import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import useTheme from "../../hooks/useTheme";
import useAuth from "../../hooks/useAuth";
import { verifyExternalPaymentStatus } from "../../services/subscriptionService";

export default function PaymentPendingScreen({ route }) {
  const { transaction_id, amount } = route.params || {};
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { refreshCurrentUser, pendingTransactionId, pendingAmount } = useAuth();
  const [verifying, setVerifying] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const paymentReference = transaction_id || pendingTransactionId;
  const displayAmount = amount ?? pendingAmount;

  const copyTransactionId = async () => {
    if (!paymentReference) return;
    try {
      await Share.share({ message: String(paymentReference) });
    } catch {
      Alert.alert("Transaction ID", String(paymentReference));
    }
  };

  const handleVerifyPayment = async () => {
    if (!paymentReference) return;
    setVerifying(true);
    setStatusMessage("");

    try {
      const result = await verifyExternalPaymentStatus(paymentReference);
      if (result.success && (result.account_status === "active" || result.account_status === "success")) {
        await refreshCurrentUser();
        Alert.alert("Payment confirmed", "Your account is now active.");
        return;
      }

      const message = result.message || "Payment is still pending.";
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

  if (!paymentReference) {
    return (
      <View style={styles.container}>
        <Text style={styles.header}>Payment pending</Text>
        <Text style={styles.subtext}>No transaction reference was provided.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Ionicons name="time-outline" size={64} color={colors.primary} style={styles.icon} />
      <Text style={styles.header}>Complete your payment</Text>
      <Text style={styles.subtext}>
        Pay using the transaction ID below, then tap Verify Payment once completed.
      </Text>

      <View style={styles.detailBox}>
        <Text style={styles.label}>Transaction ID</Text>
        <Text style={styles.txRef} selectable>
          {paymentReference}
        </Text>
        {displayAmount != null ? (
          <Text style={styles.amountText}>Amount: ETB {displayAmount}</Text>
        ) : null}
      </View>

      <TouchableOpacity style={styles.secondaryButton} onPress={copyTransactionId}>
        <Ionicons name="copy-outline" size={18} color={colors.primary} />
        <Text style={styles.secondaryButtonText}>Copy Transaction ID</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.verifyButton, verifying && styles.buttonDisabled]}
        onPress={handleVerifyPayment}
        disabled={verifying}
      >
        {verifying ? (
          <ActivityIndicator color={colors.surface} />
        ) : (
          <Text style={styles.verifyText}>Verify Payment</Text>
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
      marginTop: 12,
    },
    secondaryButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.primary,
      marginBottom: 12,
    },
    secondaryButtonText: {
      color: colors.primary,
      fontSize: 15,
      fontWeight: "700",
    },
    verifyButton: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: "center",
    },
    buttonDisabled: {
      opacity: 0.7,
    },
    verifyText: {
      color: colors.surface,
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
