import React, { useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import useTheme from "../../hooks/useTheme";
import { forgotPassword } from "../../api/auth.api";

export default function ForgotPasswordScreen({ navigation }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendReset = async () => {
    if (!email.trim()) {
      Alert.alert(t("forgotPassword.validation.title"), t("forgotPassword.validation.emailRequired") || "Please enter your email address.");
      return;
    }

    setLoading(true);
    try {
      await forgotPassword(email.trim().toLowerCase());
      Alert.alert(
        t("forgotPassword.success.title") || "Reset email sent",
        t("forgotPassword.success.message") || "Check your email for the reset code."
      );
      navigation.navigate("ResetPassword", { email: email.trim().toLowerCase() });
    } catch (error) {
      const message = error.response?.data?.detail || error.response?.data?.message || error.message;
      Alert.alert(
        t("forgotPassword.error.title") || "Unable to send reset email",
        typeof message === "string" ? message : JSON.stringify(message)
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
      <View style={styles.container}>
        <Text style={styles.title}>{t("forgotPassword.title") || "Forgot password"}</Text>
        <Text style={styles.subtitle}>{t("forgotPassword.subtitle") || "Enter your email to receive a reset code."}</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder={t("forgotPassword.emailPlaceholder") || "Email"}
            placeholderTextColor={colors.placeholder}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>
        <TouchableOpacity style={styles.button} onPress={handleSendReset} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t("forgotPassword.button") || "Send reset code"}</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkButton} onPress={() => navigation.goBack()}>
          <Text style={styles.linkText}>{t("forgotPassword.backToLogin") || "Back to login"}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    scrollContainer: {
      flexGrow: 1,
      backgroundColor: colors.muted,
    },
    container: {
      flex: 1,
      justifyContent: "center",
      padding: 24,
    },
    title: {
      fontSize: 28,
      fontWeight: "900",
      color: colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 15,
      color: colors.textSecondary,
      marginBottom: 24,
      lineHeight: 22,
    },
    inputContainer: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 16,
    },
    input: {
      padding: 16,
      fontSize: 16,
      color: colors.text,
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: "center",
      marginTop: 8,
    },
    buttonText: {
      color: colors.surface,
      fontSize: 16,
      fontWeight: "700",
    },
    linkButton: {
      alignItems: "center",
      marginTop: 18,
    },
    linkText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: "700",
    },
  });
