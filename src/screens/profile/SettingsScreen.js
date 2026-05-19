import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView, Alert, Linking, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import useTheme from "../../hooks/useTheme";

export default function SettingsScreen() {
  const { colors, isDarkMode, toggleDarkMode } = useTheme();
  const [notifications, setNotifications] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(true);
  const [language, setLanguage] = useState("English");

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

    loadNotificationPermission();
  }, []);

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
            "Notifications denied",
            "Please allow notifications in your device settings.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Open Settings", onPress: openAppSettings },
            ]
          );
        }
      } catch (error) {
        console.error("Notification request error:", error);
        Alert.alert("Notifications", "Unable to request notification permission.");
        setNotifications(false);
      }
    } else {
      setNotifications(false);
      Alert.alert(
        "Notifications disabled",
        Platform.select({
          ios: "You can re-enable notifications from the device settings.",
          android: "Disable notifications from app settings if you want to stop alerts.",
        })
      );
    }
  };

  const styles = createStyles(colors);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Manage your preferences and app experience.</Text>

      <View style={[styles.card, { backgroundColor: colors.surface }]}> 
        <View style={styles.row}>
          <View>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Notifications</Text>
            <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>Receive booking and new listing alerts.</Text>
          </View>
          <Switch
            value={notifications}
            onValueChange={handleNotificationToggle}
            disabled={notificationLoading}
            thumbColor={notifications ? "#ff7a00" : "#f4f3f4"}
            trackColor={{ false: "#d1d1d6", true: "#ffd9b5" }}
          />
        </View>
        <Text style={[styles.permissionHint, { color: colors.textSecondary }]}>Status: {notificationLoading ? "Checking permissions..." : notifications ? "Allowed" : "Denied"}</Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface }]}> 
        <Text style={[styles.cardTitle, { color: colors.text }]}>Dark Mode</Text>
        <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>Switch the app theme to dark mode.</Text>
        <View style={styles.row}> 
          <Text style={[styles.cardSubtitle, { color: colors.text }]}>Enable dark theme</Text>
          <Switch
            value={isDarkMode}
            onValueChange={toggleDarkMode}
            thumbColor={isDarkMode ? colors.primary : "#f4f3f4"}
            trackColor={{ false: "#d1d1d6", true: colors.primary }}
          />
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface }]}> 
        <Text style={[styles.cardTitle, { color: colors.text }]}>Language</Text>
        <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>Current selection</Text>
        <View style={styles.languageRow}>
          <TouchableOpacity 
            style={[
              styles.languageChip, 
              { backgroundColor: colors.soft },
              language === "English" && styles.languageChipActive,
            ]} 
            onPress={() => setLanguage("English")}
          > 
            <Text style={[styles.languageText, language === "English" && styles.languageTextActive]}>English</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.languageChip, 
              { backgroundColor: colors.soft },
              language === "Amharic" && styles.languageChipActive,
            ]} 
            onPress={() => setLanguage("Amharic")}
          > 
            <Text style={[styles.languageText, language === "Amharic" && styles.languageTextActive]}>Amharic</Text>
          </TouchableOpacity>
        </View>
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
});
