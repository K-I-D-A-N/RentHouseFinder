import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import useTheme from "../../hooks/useTheme";

export default function CustomerPremiumPaymentScreen({ route, navigation }) {
  const {
    checkout_url,
    tx_ref,
    transaction_id,
    amount,
    paymentType = "customer_premium",
    title,
  } = route?.params || {};

  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const isLandlord = paymentType === "landlord_subscription";

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{isLandlord ? "Complete Your Payment" : "Upgrade to Premium"}</Text>
      <Text style={styles.subtitle}>
        {isLandlord 
          ? "Choose your preferred payment method to activate your subscription plan."
          : "Choose your preferred payment method to unlock luxury listings and higher standard homes."}
      </Text>

      <TouchableOpacity
        style={styles.methodCard}
        onPress={() => navigation.navigate("ChapaCheckoutScreen", {
          checkout_url,
          tx_ref,
          transaction_id,
          amount,
          paymentType,
          title: isLandlord ? "Subscription Payment" : title,
        })}
      >
        <View style={[styles.iconWrap, { backgroundColor: "rgba(58,123,255,0.12)" }]}>
          <Ionicons name="card-outline" size={28} color="#3a7bff" />
        </View>
        <View style={styles.methodText}>
          <Text style={styles.methodTitle}>Chapa</Text>
          <Text style={styles.methodSubtitle}>Pay online with card or mobile banking</Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color={colors.textSecondary} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.methodCard}
        onPress={() => navigation.navigate("TelebirrPaymentScreen")}
      >
        <View style={[styles.iconWrap, { backgroundColor: "rgba(52,199,89,0.12)" }]}>
          <Ionicons name="phone-portrait-outline" size={28} color="#34c759" />
        </View>
        <View style={styles.methodText}>
          <Text style={styles.methodTitle}>Telebirr</Text>
          <Text style={styles.methodSubtitle}>Send payment and upload your QR receipt</Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color={colors.textSecondary} />
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
      marginBottom: 28,
    },
    methodCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 18,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    iconWrap: {
      width: 52,
      height: 52,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 14,
    },
    methodText: {
      flex: 1,
    },
    methodTitle: {
      fontSize: 17,
      fontWeight: "800",
      color: colors.text,
    },
    methodSubtitle: {
      marginTop: 4,
      fontSize: 13,
      color: colors.textSecondary,
    },
  });
