import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView, Alert, Linking, Platform, ActivityIndicator } from "react-native";
import * as Notifications from "expo-notifications";
import { useTranslation } from "react-i18next";
import { saveLanguage } from "../../i18n/i18n";
import useTheme from "../../hooks/useTheme";
import useAuth from "../../hooks/useAuth";
import { deleteCurrentUser } from "../../api/userApi";

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const { colors, isDarkMode, toggleDarkMode } = useTheme();
  const { logout } = useAuth();
  const [notifications, setNotifications] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(true);
  const [language, setLanguage] = useState(i18n.language || "en");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const loadNotificationPermission = async () => {
      try {
        const permission = await Notifications.getPermissionsAsync();
        setNotifications(permission.granted || permission.status === "granted");
      } catch (error) {
        console.error("Notification permission error:", error);
        setNotifications(false);
      } finally {
        setNotificationLoading(false);
      }
    };

    setLanguage(i18n.language || "en");
    loadNotificationPermission();
  }, [i18n.language]);

  const openAppSettings = async () => {
    try {
      await Linking.openSettings();
    } catch (error) {
      console.error("Unable to open settings", error);
    }
  };

  const handleNotificationToggle = async (value) => {
    if (value) {
      try {
        const permission = await Notifications.requestPermissionsAsync();
        const enabled = permission.granted || permission.status === "granted";
        setNotifications(enabled);
        if (!enabled) {
          Alert.alert(
            t("settings.notifications.deniedAlert.title"),
            t("settings.notifications.deniedAlert.message"),
            [
              { text: t("settings.notifications.deniedAlert.cancel"), style: "cancel" },
              { text: t("settings.notifications.deniedAlert.openSettings"), onPress: openAppSettings },
            ]
          );
        }
      } catch (error) {
        console.error("Notification request error:", error);
        Alert.alert(t("settings.notifications.title"), t("settings.notifications.requestError"));
        setNotifications(false);
      }
    } else {
      setNotifications(false);
      Alert.alert(
        t("settings.notifications.disabledAlert.title"),
        Platform.select({
          ios: t("settings.notifications.disabledAlert.ios"),
          android: t("settings.notifications.disabledAlert.android"),
        })
      );
    }
  };

  const changeLanguage = async (lang) => {
    try {
      await i18n.changeLanguage(lang);
      setLanguage(lang);
      await saveLanguage(lang);
    } catch (error) {
      console.error("Failed to change language", error);
    }
  };

  const deleteAccount = async () => {
    setIsDeleting(true);
    try {
      await deleteCurrentUser();
      await logout();
      Alert.alert("Account deleted", "Your account has been deleted successfully.");
    } catch (error) {
      console.error("Delete account failed:", error?.response || error);
      const message =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.response?.data ||
        error.message ||
        "Failed to delete account. Please try again.";
      Alert.alert("Failed to delete account", typeof message === "string" ? message : JSON.stringify(message));
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to permanently deactivate your account? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: deleteAccount },
      ]
    );
  };

  const styles = createStyles(colors);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: colors.text }]}>{t("settings.title")}</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t("settings.subtitle")}</Text>

      <View style={[styles.card, { backgroundColor: colors.surface }]}> 
        <View style={styles.row}>
          <View>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{t("settings.notifications.title")}</Text>
            <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>{t("settings.notifications.subtitle")}</Text>
          </View>
          <Switch
            value={notifications}
            onValueChange={handleNotificationToggle}
            disabled={notificationLoading}
            thumbColor={notifications ? "#ff7a00" : "#f4f3f4"}
            trackColor={{ false: "#d1d1d6", true: "#ffd9b5" }}
          />
        </View>
        <Text style={[styles.permissionHint, { color: colors.textSecondary }]}> {t("settings.notifications.status")}: {notificationLoading ? t("settings.notifications.checking") : notifications ? t("settings.notifications.allowed") : t("settings.notifications.denied")} </Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface }]}> 
        <Text style={[styles.cardTitle, { color: colors.text }]}>{t("settings.darkMode.title")}</Text>
        <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>{t("settings.darkMode.subtitle")}</Text>
        <View style={styles.row}> 
          <Text style={[styles.cardSubtitle, { color: colors.text }]}>{t("settings.darkMode.enable")}</Text>
          <Switch
            value={isDarkMode}
            onValueChange={toggleDarkMode}
            thumbColor={isDarkMode ? colors.primary : "#f4f3f4"}
            trackColor={{ false: "#d1d1d6", true: colors.primary }}
          />
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface }]}> 
        <Text style={[styles.cardTitle, { color: colors.text }]}>{t("settings.language.title")}</Text>
        <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>{t("settings.language.subtitle")}</Text>
        <View style={styles.languageRow}>
          <TouchableOpacity 
            style={[
              styles.languageChip, 
              { backgroundColor: colors.soft },
              language === "en" && styles.languageChipActive,
            ]} 
            onPress={() => changeLanguage("en")}
          > 
            <Text style={[styles.languageText, language === "en" && styles.languageTextActive]}>{t("settings.language.english")}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.languageChip, 
              { backgroundColor: colors.soft },
              language === "am" && styles.languageChipActive,
            ]} 
            onPress={() => changeLanguage("am")}
          > 
            <Text style={[styles.languageText, language === "am" && styles.languageTextActive]}>{t("settings.language.amharic")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface }]}> 
        <Text style={[styles.cardTitle, { color: colors.text }]}>{"Delete Account"}</Text>
        <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>{"Permanently deactivate your account and clear your session."}</Text>
        <TouchableOpacity
          style={[
            styles.deleteButton,
            { backgroundColor: "#d32f2f" },
            isDeleting && styles.disabledButton,
          ]}
          onPress={confirmDeleteAccount}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.deleteButtonText}>{"Delete Account"}</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 24,
    paddingTop: 32,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    marginTop: 20,
    padding: 20,
    borderRadius: 24,
    backgroundColor: colors.surface,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 5,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  cardSubtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
  },
  languageRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 16,
  },
  languageChip: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 999,
    marginRight: 10,
    marginBottom: 10,
  },
  languageChipActive: {
    backgroundColor: colors.soft,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  languageText: {
    fontWeight: "700",
    color: colors.text,
  },
  languageTextActive: {
    color: colors.surface,
  },
  languageChipActive: {
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  permissionHint: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
  },
  deleteButton: {
    marginTop: 18,
    paddingVertical: 14,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#ffffff",
  },
  disabledButton: {
    opacity: 0.65,
  },
});
