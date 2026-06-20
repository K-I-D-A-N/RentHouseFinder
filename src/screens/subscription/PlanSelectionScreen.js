import React from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import useTheme from "../../hooks/useTheme";
import useSubscription from "../../hooks/useSubscription";
import useAuth from "../../hooks/useAuth";

const getPlanLimit = (plan, keys) => {
  for (const key of keys) {
    if (plan[key] != null) return plan[key];
  }
  return "–";
};

export default function PlanSelectionScreen({ navigation, route }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { plans, loading, error, choosePlan } = useSubscription();
  const { refreshCurrentUser, applySession, register } = useAuth();
  const { registrationData } = route.params || {};

  const handleSelectPlan = async (planId) => {
    try {
      if (registrationData) {
        const data = await register({ ...registrationData, plan_id: planId });
        navigation.replace("OTPVerification", { email: registrationData.email });
        return;
      }

      const result = await choosePlan(planId);
      const transactionId = result.transaction_id || result.transactionId;
      const amount = result.amount ?? null;
      const accountStatus = result.account_status || result.status;

      await applySession(result);
      await refreshCurrentUser();

      if (accountStatus === "pending_payment" && transactionId) {
        navigation.replace("PaymentPendingScreen", {
          transaction_id: transactionId,
          amount,
        });
        return;
      }

      Alert.alert("Plan selected", "Your plan has been updated.");
      navigation.goBack();
    } catch (err) {
      const message = err.response?.data || err.message || "Plan selection failed.";
      Alert.alert("Selection Failed", typeof message === "string" ? message : JSON.stringify(message));
    }
  };

  const renderLimit = (label, value) => (
    <Text style={styles.planLimit}>{label}: {value ?? "–"}</Text>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading plans…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>Unable to load plans</Text>
        <Text style={styles.emptyMessage}>Please check your connection and try again.</Text>
      </View>
    );
  }

  if (!plans || plans.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No plans available</Text>
        <Text style={styles.emptyMessage}>Please check back later.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Choose a subscription plan</Text>
      <FlatList
        data={plans}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const price = item.price || item.monthly_price || item.amount || "Free";
          return (
            <View style={styles.planCard}>
              <View style={styles.planHeader}>
                <Text style={styles.planTitle}>{item.name}</Text>
                <Text style={styles.planPrice}>{price}</Text>
              </View>
              <Text style={styles.planDescription}>{item.description || "Subscription plan details."}</Text>
              {renderLimit("Max posts", getPlanLimit(item, ["max_posts", "listing_limit", "max_listings"]))}
              {renderLimit("Max approvals", getPlanLimit(item, ["max_approvals", "approval_limit"]))}
              {renderLimit("Max premium posts", getPlanLimit(item, ["max_premium_posts", "premium_limit"]))}
              <TouchableOpacity style={styles.selectButton} onPress={() => handleSelectPlan(item.id)}>
                <Text style={styles.buttonText}>Select plan</Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: 20,
    },
    header: {
      fontSize: 24,
      fontWeight: "800",
      color: colors.text,
      marginBottom: 20,
    },
    listContent: {
      paddingBottom: 20,
    },
    planCard: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 18,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    planHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    planTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.text,
      flex: 1,
      marginRight: 12,
    },
    planPrice: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.primary,
    },
    planDescription: {
      color: colors.textSecondary,
      fontSize: 14,
      marginBottom: 14,
      lineHeight: 20,
    },
    planLimit: {
      color: colors.textSecondary,
      fontSize: 13,
      marginBottom: 4,
    },
    selectButton: {
      marginTop: 16,
      backgroundColor: colors.primary,
      paddingVertical: 14,
      borderRadius: 16,
      alignItems: "center",
    },
    buttonText: {
      color: colors.surface,
      fontWeight: "700",
      fontSize: 15,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.background,
    },
    loadingText: {
      marginTop: 16,
      color: colors.textSecondary,
      fontSize: 15,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
      backgroundColor: colors.background,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: colors.text,
      marginBottom: 10,
      textAlign: "center",
    },
    emptyMessage: {
      color: colors.textSecondary,
      fontSize: 15,
      textAlign: "center",
    },
  });
