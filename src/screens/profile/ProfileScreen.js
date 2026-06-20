import React, { useEffect, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView, Alert, ActivityIndicator, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import useAuth from "../../hooks/useAuth";
import useTheme from "../../hooks/useTheme";
import { saveProfileImage } from "../../services/storage";

export default function ProfileScreen({ navigation }) {
  const { t } = useTranslation();
  const { user, role, logout, updateUserProfile, fetchCurrentUser, emailVerified, accountStatus, isPremiumCustomer, premiumUntil, canPostListings, canViewPremiumListings } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const handleLogout = () => {
    logout();
    navigation.reset({ index: 0, routes: [{ name: "Auth" }] });
  };

  const { colors } = useTheme();
  const [uploading, setUploading] = useState(false);
  const [profileImage, setProfileImage] = useState(user?.profile_image || null);
  const name = user?.full_name || user?.name || user?.username || t("profile.noName");
  const email = user?.email || t("profile.noEmail");
  const phone = user?.phone || user?.mobile || t("profile.noPhone");
  const initial = name?.charAt(0)?.toUpperCase() || "?";
  const roleKey = role?.toLowerCase();
  const isLandlord = roleKey === "landlord";

  useEffect(() => {
    setProfileImage(user?.profile_image || null);
  }, [user?.profile_image]);

  useFocusEffect(
    useCallback(() => {
      fetchCurrentUser?.();
    }, [fetchCurrentUser])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCurrentUser?.();
    setRefreshing(false);
  };

  const handleListingsPress = () => {
    if (isLandlord) {
      navigation.navigate("MyListings");
    } else {
      Alert.alert(
        t("profile.landlordOnly.title"),
        t("profile.landlordOnly.message"),
        [{ text: t("profile.imageSource.cancel") }]
      );
    }
  };

  const handleBookingsPress = () => {
    navigation.navigate("MyBookings");
  };

  const pickImage = async (useCamera = false) => {
    try {
      let result;
      if (useCamera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (permission.status !== "granted") {
          Alert.alert(t("profile.permission.title"), t("profile.permission.camera"));
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
        });
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permission.status !== "granted") {
          Alert.alert(t("profile.permission.title"), t("profile.permission.gallery"));
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
        });
      }

      if (!result.canceled && result.assets?.[0]) {
        uploadProfileImage(result.assets[0]);
      }
    } catch (error) {
      console.error("Image picker error:", error);
      Alert.alert(t("profile.permission.title"), t("profile.uploadFailed"));
    }
  };

  const uploadProfileImage = async (asset) => {
    setUploading(true);
    setProfileImage(asset.uri);

    try {
      const uriParts = asset.uri.split(".");
      const fileExtension = uriParts[uriParts.length - 1]?.split("?")[0] || "jpg";
      const mimeType = asset.type && asset.type.includes("/") ? asset.type : `image/${fileExtension === "png" ? "png" : "jpeg"}`;
      const fileName = asset.fileName || `profile_${Date.now()}.${fileExtension}`;

      const formData = new FormData();
      formData.append("profile_image", {
        uri: asset.uri,
        type: mimeType,
        name: fileName,
      });

      await updateUserProfile(formData);

      const userId = user?.id || user?.user_id || user?.email;
      if (userId && asset.uri) {
        await saveProfileImage(userId, asset.uri);
      }

      Alert.alert(t("profile.uploadSuccess.title"), t("profile.uploadSuccess.message"));
    } catch (error) {
      console.error("Upload failed:", error);
      Alert.alert(t("profile.uploadFailed"), error.message || t("profile.uploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      t("profile.imageSource.title"),
      t("profile.imageSource.message"),
      [
        { text: t("profile.imageSource.camera"), onPress: () => pickImage(true) },
        { text: t("profile.imageSource.gallery"), onPress: () => pickImage(false) },
        { text: t("profile.imageSource.cancel"), style: "cancel" },
      ]
    );
  };

  const displayedProfileImage = profileImage || user?.profile_image;
  const styles = createStyles(colors);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.screenTitle}>Profile</Text>

      <View style={styles.badgesRow}>
        <View style={[styles.badge, { backgroundColor: isLandlord ? "rgba(255,107,0,0.12)" : "rgba(58,123,255,0.12)" }]}>
          <Text style={[styles.badgeText, { color: isLandlord ? colors.primary : "#3a7bff" }]}>
            {isLandlord ? "Landlord" : "Customer"}
          </Text>
        </View>
        {isPremiumCustomer ? (
          <View style={[styles.badge, { backgroundColor: "rgba(245,166,35,0.15)" }]}>
            <Text style={[styles.badgeText, { color: "#f5a623" }]}>Premium</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.statusCard}>
        <Text style={styles.statusLine}>Email verified: {emailVerified ? "Yes" : "No"}</Text>
        <Text style={styles.statusLine}>Account status: {accountStatus || "—"}</Text>
        <Text style={styles.statusLine}>Can post listings: {canPostListings ? "Yes" : "No"}</Text>
        <Text style={styles.statusLine}>Premium listings access: {canViewPremiumListings ? "Yes" : "No"}</Text>
        {premiumUntil ? <Text style={styles.statusLine}>Premium until: {premiumUntil}</Text> : null}
      </View>

      <TouchableOpacity style={styles.profileCard} onPress={showImageOptions} disabled={uploading}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatarCircle}>
            {displayedProfileImage ? (
              <Image source={{ uri: displayedProfileImage }} style={styles.avatarImage} resizeMode="contain" />
            ) : (
              <Text style={styles.avatarInitial}>{initial}</Text>
            )}
          </View>
          {uploading && <ActivityIndicator style={styles.uploadOverlay} color={colors.primary} size="small" />}
          <View style={styles.uploadIcon}>
            <Ionicons name="camera" size={14} color={colors.surface} />
          </View>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{name}</Text>
          <Text style={styles.profileEmail}>{email}</Text>
          <Text style={styles.profilePhone}>{phone}</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.optionsCard}>
        {isLandlord && (
          <TouchableOpacity style={styles.optionItem} onPress={handleListingsPress}>
            <View style={[styles.optionIcon, { backgroundColor: "rgba(255,107,0,0.12)" }]}> 
              <Ionicons name="home-outline" size={22} color={colors.primary} />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>{t("profile.myListings")}</Text>
              <Text style={styles.optionSubtitle}>{t("profile.myListingsSubtitle")}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}

        {!isLandlord && (
          <TouchableOpacity style={styles.optionItem} onPress={handleBookingsPress}>
            <View style={[styles.optionIcon, { backgroundColor: "rgba(52,199,89,0.12)" }]}> 
              <Ionicons name="calendar-outline" size={22} color="#34c759" />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>{t("profile.myBookings")}</Text>
              <Text style={styles.optionSubtitle}>{t("profile.myBookingsSubtitle")}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.optionItem} onPress={() => navigation.navigate("Settings")}>
          <View style={[styles.optionIcon, { backgroundColor: "rgba(58,123,255,0.12)" }]}> 
            <Ionicons name="settings-outline" size={22} color="#3a7bff" />
          </View>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>{t("profile.settings")}</Text>
            <Text style={styles.optionSubtitle}>{t("profile.settingsSubtitle")}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.optionItem} onPress={handleLogout}>
          <View style={[styles.optionIcon, { backgroundColor: "rgba(231,76,60,0.12)" }]}> 
            <Ionicons name="log-out-outline" size={22} color="#e74c3c" />
          </View>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>{t("profile.logout")}</Text>
            <Text style={styles.optionSubtitle}>{t("profile.logoutSubtitle")}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {!isLandlord && (
        <View style={styles.ctaCard}>
          <Text style={styles.ctaTitle}>{t("profile.ctaTitle")}</Text>
          <Text style={styles.ctaSubtitle}>{t("profile.ctaSubtitle")}</Text>
          <TouchableOpacity style={styles.ctaButton} onPress={handleListingsPress}>
            <Text style={styles.ctaButtonText}>{t("profile.postProperty")}</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
    padding: 20,
    paddingBottom: 32,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: colors.text,
    marginBottom: 18,
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "800",
  },
  statusCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusLine: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 6,
    marginBottom: 24,
  },
  avatarContainer: {
    position: "relative",
    marginRight: 16,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  uploadOverlay: {
    position: "absolute",
  },
  uploadIcon: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: colors.surface,
  },
  avatarInitial: {
    color: colors.surface,
    fontSize: 28,
    fontWeight: "900",
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
  },
  profileEmail: {
    marginTop: 6,
    fontSize: 14,
    color: colors.textSecondary,
  },
  profilePhone: {
    marginTop: 4,
    fontSize: 14,
    color: colors.textSecondary,
  },
  optionsCard: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    paddingVertical: 12,
    paddingHorizontal: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 6,
    marginBottom: 24,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderRadius: 24,
    backgroundColor: colors.surface,
    marginBottom: 10,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
  },
  optionSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textSecondary,
  },
  ctaCard: {
    backgroundColor: colors.primary,
    borderRadius: 28,
    padding: 24,
  },
  ctaTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.surface,
    marginBottom: 8,
  },
  ctaSubtitle: {
    fontSize: 14,
    color: colors.surface,
    marginBottom: 20,
    lineHeight: 22,
  },
  ctaButton: {
    backgroundColor: colors.surface,
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
  },
  ctaButtonText: {
    color: colors.primary,
    fontWeight: "800",
    fontSize: 16,
  },
});
