import React, { useMemo, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Camera } from "expo-camera";
import useTheme from "../../hooks/useTheme";
import useSubscription from "../../hooks/useSubscription";
import useAuth from "../../hooks/useAuth";

const TELEBIRR_NUMBER = "0987624298";

const extractTransactionId = (data) => {
  try {
    const parsed = JSON.parse(data);
    if (parsed.transactionId) return parsed.transactionId;
    if (parsed.transaction_id) return parsed.transaction_id;
  } catch (e) {
    const match = data.match(/[?&](?:tx|transactionId|transaction_id)=([^&]+)/);
    if (match && match[1]) return match[1];
  }
  return data.trim();
};

export default function TelebirrPaymentScreen({ route, navigation }) {
  const { plan_id, paymentType = "customer_premium" } = route?.params || {};
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { upgradeCustomerPremium, choosePlan } = useSubscription();
  const { refreshCurrentUser } = useAuth();
  const [loading, setLoading] = useState(false);

  const submitTransaction = async (transactionId) => {
    try {
      if (paymentType === "landlord_subscription" && plan_id) {
        await choosePlan(plan_id, { transaction_id: transactionId });
      } else {
        await upgradeCustomerPremium({ transaction_id: transactionId });
      }
      await refreshCurrentUser?.();
      Alert.alert("Success", `Transaction ${transactionId} submitted successfully!`, [
        { text: "OK", onPress: () => navigation.navigate("ProfileMain") },
      ]);
    } catch (error) {
      const message = error.response?.data || error.message || "Unable to submit transaction.";
      Alert.alert("Submission failed", typeof message === "string" ? message : JSON.stringify(message));
    }
  };

  const handlePickAndScanQR = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permission Required", "You need to allow access to your photos to upload a QR code.");
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 1,
      });

      if (pickerResult.canceled || !pickerResult.assets?.[0]?.uri) {
        return;
      }

      setLoading(true);
      const selectedImageUri = pickerResult.assets[0].uri;
      const scanResults = await Camera.scanFromURLAsync(selectedImageUri, ["qr"]);

      if (scanResults && scanResults.length > 0) {
        const transactionId = extractTransactionId(scanResults[0].data);
        if (transactionId) {
          await submitTransaction(transactionId);
        } else {
          Alert.alert("Error", "Valid Transaction ID could not be found in the QR code data.");
        }
      } else {
        Alert.alert("Failed", "No valid QR code detected in that image.");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "An error occurred while analyzing the image.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>

      <Text style={styles.header}>Pay with Telebirr</Text>
      <Text style={styles.subtitle}>
        Send your payment to the number below, then upload a screenshot of your QR code or select the QR image from your gallery.
      </Text>

      <View style={styles.numberCard}>
        <Ionicons name="call-outline" size={22} color={colors.primary} />
        <Text style={styles.numberLabel}>Send to</Text>
        <Text style={styles.numberValue}>{TELEBIRR_NUMBER}</Text>
      </View>

      <TouchableOpacity
        style={[styles.uploadButton, loading && styles.uploadButtonDisabled]}
        onPress={handlePickAndScanQR}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.surface} />
        ) : (
          <>
            <Ionicons name="qr-code-outline" size={22} color={colors.surface} style={styles.uploadIcon} />
            <Text style={styles.uploadButtonText}>Upload QR Code Image</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: 24,
    },
    backButton: {
      marginBottom: 16,
      alignSelf: "flex-start",
      padding: 4,
    },
    header: {
      fontSize: 26,
      fontWeight: "800",
      color: colors.text,
      marginBottom: 10,
    },
    subtitle: {
      fontSize: 15,
      color: colors.textSecondary,
      lineHeight: 22,
      marginBottom: 24,
    },
    numberCard: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 20,
      alignItems: "center",
      marginBottom: 24,
      borderWidth: 1,
      borderColor: colors.border,
    },
    numberLabel: {
      marginTop: 8,
      fontSize: 14,
      color: colors.textSecondary,
    },
    numberValue: {
      marginTop: 6,
      fontSize: 28,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: 1,
    },
    uploadButton: {
      backgroundColor: colors.primary,
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "center",
    },
    uploadButtonDisabled: {
      opacity: 0.7,
    },
    uploadIcon: {
      marginRight: 8,
    },
    uploadButtonText: {
      color: colors.surface,
      fontWeight: "700",
      fontSize: 16,
    },
  });
