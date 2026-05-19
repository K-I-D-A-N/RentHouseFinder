import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView, Alert, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import useAuth from "../../hooks/useAuth";
import useTheme from "../../hooks/useTheme";
import { saveProfileImage } from "../../services/storage";

export default function ProfileScreen({ navigation }) {
  const { user, logout, updateUserProfile } = useAuth();
  const { colors } = useTheme();
  const [uploading, setUploading] = useState(false);
  const [profileImage, setProfileImage] = useState(user?.profile_image || null);
  const name = user?.full_name || user?.name || user?.username || "No name available";
  const email = user?.email || "No email available";
  const phone = user?.phone || user?.mobile || "No phone available";
  const initial = name?.charAt(0)?.toUpperCase() || "?";

  useEffect(() => {
    setProfileImage(user?.profile_image || null);
  }, [user?.profile_image]);

  const handleListingsPress = () => {
    navigation.getParent()?.navigate("Post");
  };

  const pickImage = async (useCamera = false) => {
    try {
      let result;
      if (useCamera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (permission.status !== "granted") {
          Alert.alert("Permission", "Camera permission is required.");
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
          Alert.alert("Permission", "Gallery permission is required.");
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
      Alert.alert("Error", "Failed to pick image.");
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

      Alert.alert("Success", "Profile image updated.");
    } catch (error) {
      console.error("Upload failed:", error);
      Alert.alert("Upload Failed", error.message || "Unable to upload profile image.");
    } finally {
      setUploading(false);
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      "Choose Image Source",
      "Select where to upload your profile picture from",
      [
        { text: "Camera", onPress: () => pickImage(true) },
        { text: "Gallery", onPress: () => pickImage(false) },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const displayedProfileImage = profileImage || user?.profile_image;
  const styles = createStyles(colors);

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.screenTitle}>Profile</Text>

      <TouchableOpacity style={styles.profileCard} onPress={showImageOptions} disabled={uploading}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatarCircle}>
            {displayedProfileImage ? (
              <Image source={{ uri: displayedProfileImage }} style={styles.avatarImage} resizeMode="cover" />
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
        <TouchableOpacity style={styles.optionItem} onPress={handleListingsPress}>
          <View style={[styles.optionIcon, { backgroundColor: "rgba(255,107,0,0.12)" }]}> 
            <Ionicons name="home-outline" size={22} color={colors.primary} />
          </View>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>My Listings</Text>
            <Text style={styles.optionSubtitle}>Manage your properties</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.optionItem} onPress={() => navigation.navigate("Settings")}>
          <View style={[styles.optionIcon, { backgroundColor: "rgba(58,123,255,0.12)" }]}> 
            <Ionicons name="settings-outline" size={22} color="#3a7bff" />
          </View>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>Settings</Text>
            <Text style={styles.optionSubtitle}>App preferences</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.optionItem} onPress={logout}>
          <View style={[styles.optionIcon, { backgroundColor: "rgba(231,76,60,0.12)" }]}> 
            <Ionicons name="log-out-outline" size={22} color="#e74c3c" />
          </View>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>Logout</Text>
            <Text style={styles.optionSubtitle}>Sign out of your account</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.ctaCard}>
        <Text style={styles.ctaTitle}>Want to list your property?</Text>
        <Text style={styles.ctaSubtitle}>Reach thousands of potential buyers and renters</Text>
        <TouchableOpacity style={styles.ctaButton} onPress={handleListingsPress}>
          <Text style={styles.ctaButtonText}>Post Property</Text>
        </TouchableOpacity>
      </View>
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
