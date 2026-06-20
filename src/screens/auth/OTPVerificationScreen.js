import React, { useEffect, useMemo, useState, useRef, useCallback, useLayoutEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  BackHandler,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { MaterialIcons as Icon } from "@expo/vector-icons";
import { verifyEmail, resendOtp } from "../../api/auth.api";
import useTheme from "../../hooks/useTheme";
import useAuth from "../../hooks/useAuth";

export default function OTPVerificationScreen({ route, navigation }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user, applySession, refreshCurrentUser } = useAuth();

  const { email: routeEmail, nextStepFallback } = route.params || {};
  const email = routeEmail || user?.email || "";
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [timer, setTimer] = useState(30);
  const [errorMessage, setErrorMessage] = useState("");
  const timerRef = useRef(null);

  useEffect(() => {
    if (timer <= 0) return;
    timerRef.current = setTimeout(() => setTimer((prev) => prev - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [timer]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const isValidOtp = otp.trim().length === 6;

  const handleNavigationStep = async (nextStep, responseData) => {
    await applySession(responseData);
    await refreshCurrentUser();

    if (nextStep === "login") {
      return navigation.replace("Login");
    }
    if (nextStep === "select_plan") {
      return navigation.replace("PlanSelectionScreen", { planData: responseData });
    }
    if (nextStep === "complete_payment") {
      const transactionId = responseData.transaction_id || responseData.transactionId;
      const amount = responseData.amount ?? null;
      return navigation.replace("PaymentPendingScreen", { transaction_id: transactionId, amount });
    }
    if (nextStepFallback) {
      return navigation.replace(nextStepFallback);
    }
    return navigation.replace("Login");
  };

  const handleVerify = async () => {
    if (!isValidOtp || !email) return;
    setLoading(true);
    setErrorMessage("");

    try {
      const response = await verifyEmail(email, otp);
      const data = response.data || response;
      const nextStep = data.next_step || data.nextStep;
      await handleNavigationStep(nextStep, data);
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.detail ||
        error.message ||
        t("otp.errorInvalid");
      setErrorMessage(typeof message === "string" ? message : JSON.stringify(message));
      Alert.alert(t("otp.errorTitle"), typeof message === "string" ? message : JSON.stringify(message));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0 || !email) return;
    setResendLoading(true);
    setErrorMessage("");

    try {
      await resendOtp(email, "register");
      setTimer(30);
      Alert.alert(t("otp.resendSuccessTitle"), t("otp.resendSuccessMessage"));
    } catch (error) {
      const message = error.response?.data?.message || error.message || t("otp.resendError");
      Alert.alert(t("otp.resendErrorTitle"), typeof message === "string" ? message : JSON.stringify(message));
    } finally {
      setResendLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        const registrationData = route.params?.registrationData;
        navigation.navigate("Register", { registrationData, email: routeEmail || email });
        return true;
      };

      const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);

      return () => subscription.remove();
    }, [navigation, route.params, routeEmail, email])
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => {
            const registrationData = route.params?.registrationData;
            navigation.navigate("Register", { registrationData, email: routeEmail || email });
          }}
          style={{ paddingHorizontal: 12 }}
        >
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, route.params, routeEmail, email, colors]);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{t("otp.title")}</Text>
      <Text style={styles.subtitle}>{t("otp.subtitle")}</Text>
      <View style={styles.emailPill}>
        <Icon name="email" size={18} color={colors.primary} />
        <Text style={styles.emailText}>{email}</Text>
      </View>
      <TextInput
        value={otp}
        onChangeText={(value) => {
          setOtp(value.replace(/[^0-9]/g, ""));
          setErrorMessage("");
        }}
        placeholder={t("otp.inputPlaceholder")}
        placeholderTextColor={colors.placeholder}
        keyboardType="number-pad"
        maxLength={6}
        style={styles.input}
      />
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      <TouchableOpacity
        style={[styles.button, !isValidOtp || loading ? styles.buttonDisabled : null]}
        onPress={handleVerify}
        disabled={!isValidOtp || loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t("otp.verifyButton")}</Text>}
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.linkButton, timer > 0 || resendLoading ? styles.linkButtonDisabled : null]}
        onPress={handleResend}
        disabled={timer > 0 || resendLoading}
      >
        {resendLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Text style={[styles.linkText, timer > 0 ? styles.linkTextDisabled : null]}>
            {timer > 0 ? t("otp.resendCountdown", { seconds: timer }) : t("otp.resendButton")}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 24,
      backgroundColor: colors.background,
      justifyContent: "center",
    },
    header: {
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
    emailPill: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      padding: 14,
      borderRadius: 16,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    emailText: {
      marginLeft: 10,
      color: colors.text,
      fontSize: 14,
    },
    input: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      fontSize: 16,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: "center",
      marginTop: 10,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 4,
    },
    buttonDisabled: {
      backgroundColor: colors.muted,
    },
    buttonText: {
      color: colors.surface,
      fontSize: 16,
      fontWeight: "700",
    },
    linkButton: {
      marginTop: 18,
      alignItems: "center",
    },
    linkButtonDisabled: {
      opacity: 0.6,
    },
    linkText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: "700",
    },
    linkTextDisabled: {
      color: colors.textSecondary,
    },
    errorText: {
      color: "#d93025",
      fontSize: 13,
      marginBottom: 8,
    },
  });
