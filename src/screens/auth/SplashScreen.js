import React, { useEffect, useMemo } from "react";
import { View, Text, StyleSheet, Image, ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import useTheme from "../../hooks/useTheme";

export default function SplashScreen({ navigation }) {
  const { t } = useTranslation();
  useEffect(() => {
    const timeout = setTimeout(() => {
      navigation.replace("Onboarding");
    }, 1800);
    return () => clearTimeout(timeout);
  }, [navigation]);

  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.logoCard}>
        <Image
          source={require("../../../assets/images/gojjo.jpg")}
          style={styles.logoIcon}
        />
        <Text style={styles.logoText}>{t("splash.appName")}</Text>
      </View>
      <Text style={styles.tagline}>{t("splash.tagline")}</Text>
    </ScrollView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  logoCard: {
    backgroundColor: colors.surface,
    borderRadius: 32,
    width: 180,
    height: 180,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  logoIcon: {
    width: 70,
    height: 70,
    tintColor: colors.primary,
  },
  logoText: {
    marginTop: 16,
    fontSize: 28,
    fontWeight: "800",
    color: colors.text,
  },
  tagline: {
    marginTop: 30,
    textAlign: "center",
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
  },
});
