import React, { useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import useTheme from "../../hooks/useTheme";
import { resetPassword } from "../../api/auth.api";

export default function ResetPasswordScreen({ route, navigation }) {
  const { email: initialEmail } = route.params || {};
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [email, setEmail] = useState(initialEmail || "");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!email.trim() || !otp.trim() || !password || !confirmPassword) {
      Alert.alert(t("resetPassword.validation.title"), t("resetPassword.validation.fillAll") || "Please fill in all fields.");
      return;
    }
    if (password.length < 8) {
      Alert.alert(t("resetPassword.validation.title"), t("resetPassword.validation.passwordLength") || "Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert(t("resetPassword.validation.title"), t("resetPassword.validation.passwordMatch") || "Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await resetPassword({ email: email.trim().toLowerCase(), otp: otp.trim(), new_password: password });
      Alert.alert(
        t("resetPassword.success.title") || "Password reset successful",
        t("resetPassword.success.message") || "You can now log in with your new password."
      );
      navigation.replace("Login");
    } catch (error) {
      const message = error.response?.data?.detail || error.response?.data?.message || error.message;
      Alert.alert(
        t("resetPassword.error.title") || "Unable to reset password",
        typeof message === "string" ? message : JSON.stringify(message)
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
      <View style={styles.container}>
        <Text style={styles.title}>{t("resetPassword.title") || "Reset password"}</Text>
        <Text style={styles.subtitle}>{t("resetPassword.subtitle") || "Enter your email, code, and new password."}</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder={t("resetPassword.emailPlaceholder") || "Email"}
            placeholderTextColor={colors.placeholder}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder={t("resetPassword.codePlaceholder") || "Reset code"}
            placeholderTextColor={colors.placeholder}
            keyboardType="number-pad"
            value={otp}
            onChangeText={(text) => setOtp(text.replace(/[^0-9]/g, ""))}
          />
        </View>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder={t("resetPassword.newPasswordPlaceholder") || "New password"}
            placeholderTextColor={colors.placeholder}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder={t("resetPassword.confirmPasswordPlaceholder") || "Confirm password"}
            placeholderTextColor={colors.placeholder}
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
        </View>
        <TouchableOpacity style={styles.button} onPress={handleResetPassword} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t("resetPassword.button") || "Reset password"}</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate("Login") }>
          <Text style={styles.linkText}>{t("resetPassword.backToLogin") || "Back to login"}</Text>
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
