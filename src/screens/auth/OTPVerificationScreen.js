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
  const { user, applySession, refreshCurrentUser, clearRegistrationDraft, register } = useAuth();

  const { email: routeEmail, nextStepFallback, role: routeRole, isPreRegistration: routePreRegistration } = route.params || {};
  const registrationData = route.params?.registrationData;
  const role = routeRole || registrationData?.role;
  const email = routeEmail || user?.email || "";
  const isPreRegistration = routePreRegistration || Boolean(registrationData && !user?.id);
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

  const goBackToRegister = useCallback(() => {
    navigation.replace("Register", {
      registrationData,
      email: routeEmail || email,
    });
  }, [navigation, registrationData, routeEmail, email]);

  const handleNavigationStep = async (nextStep, responseData) => {
    if (isPreRegistration && registrationData) {
      const verifiedData = { ...registrationData, otp: otp.trim() };

      if (role === "landlord") {
        return navigation.replace("PlanSelectionScreen", {
          registrationData: verifiedData,
          isRegistrationFlow: true,
        });
      }

      setLoading(true);
      try {
        await register(verifiedData);
        clearRegistrationDraft();
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
      return;
    }

    await applySession(responseData);
    await refreshCurrentUser();
    clearRegistrationDraft();

    if (nextStep === "login") {
      return navigation.replace("Login");
    }
    if (nextStep === "complete_payment") {
      const transactionId = responseData.transaction_id || responseData.transactionId;
      const amount = responseData.amount ?? null;
      return navigation.replace("PaymentPendingScreen", { transaction_id: transactionId, amount });
    }
    if (nextStep === "select_plan" || role === "landlord") {
      return navigation.replace("PlanSelectionScreen", { planData: responseData });
    }
    if (nextStepFallback) {
      return navigation.replace(nextStepFallback);
    }
  };

  const handleVerify = async () => {
    if (!isValidOtp || !email) return;
    setLoading(true);
    setErrorMessage("");

    try {
      if (isPreRegistration && registrationData) {
        await handleNavigationStep(null, null);
        return;
      }

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
        goBackToRegister();
        return true;
      };

      const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);

      return () => subscription.remove();
    }, [goBackToRegister])
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={goBackToRegister} style={{ paddingHorizontal: 12 }}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, goBackToRegister, colors]);

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={goBackToRegister} style={styles.backButton}>
        <Icon name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>
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
    backButton: {
      position: "absolute",
      top: 48,
      left: 16,
      zIndex: 1,
      padding: 8,
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
