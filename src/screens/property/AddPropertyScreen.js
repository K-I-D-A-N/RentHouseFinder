import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image, FlatList } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import useTheme from "../../hooks/useTheme";
import { createProperty } from "../../api/propertyApi";

export default function AddPropertyScreen({ navigation }) {
  const [title, setTitle] = useState("");
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [price, setPrice] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [location, setLocation] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [area, setArea] = useState("");
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState([]);

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
          aspect: [16, 9],
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
          quality: 0.7,
        });
      }

      if (!result.canceled && result.assets?.length) {
        const newImages = result.assets.map((asset) => ({
          uri: asset.uri,
          id: Date.now() + Math.random(),
        }));
        setImages([...images, ...newImages]);
      }
    } catch (error) {
      console.error("Image picker error:", error);
      Alert.alert("Error", "Failed to pick image.");
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      "Add Property Images",
      "Choose where to upload images from",
      [
        { text: "Camera", onPress: () => pickImage(true) },
        { text: "Gallery", onPress: () => pickImage(false) },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const removeImage = (id) => {
    setImages(images.filter((img) => img.id !== id));
  };

  const handleSubmit = async () => {
    if (!title || !price || !propertyType || !location) {
      Alert.alert("Validation", "Please fill in the title, price, location, and property type.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("price", Number(price));
      formData.append("property_type", propertyType);
      formData.append("location", location);
      formData.append("bedrooms", bedrooms ? Number(bedrooms) : 0);
      formData.append("bathrooms", bathrooms ? Number(bathrooms) : 0);
      formData.append("area", area ? Number(area) : 0);

      images.forEach((image, index) => {
        formData.append("images", {
          uri: image.uri,
          type: "image/jpeg",
          name: `property_${index}_${Date.now()}.jpg`,
        });
      });

      await createProperty(formData);
      Alert.alert("Success", "Property posted successfully.");
      navigation.goBack();
    } catch (error) {
      console.error("Failed to post property", error);
      const message = error.response?.data || error.message || "Unable to post property.";
      Alert.alert("Submit failed", typeof message === "string" ? message : JSON.stringify(message));
    } finally {
      setLoading(false);
    }
  };

  const renderImageThumbnail = ({ item }) => (
    <View style={styles.thumbnailContainer}>
      <Image source={{ uri: item.uri }} style={styles.thumbnail} />
      <TouchableOpacity style={styles.removeButton} onPress={() => removeImage(item.id)}>
        <Ionicons name="close-circle" size={24} color="#e74c3c" />
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post Property</Text>
      </View>

      <TouchableOpacity style={styles.uploadCard} onPress={showImageOptions}>
        <Icon name="cloud-upload" size={36} color={colors.primary} />
        <Text style={styles.uploadText}>Upload Images</Text>
        {images.length > 0 && (
          <Text style={styles.uploadSubtext}>{images.length} image{images.length !== 1 ? "s" : ""} added</Text>
        )}
      </TouchableOpacity>

      {images.length > 0 && (
        <FlatList
          data={images}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderImageThumbnail}
          horizontal
          contentContainerStyle={styles.imagesList}
          scrollEnabled={true}
        />
      )}

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Property Title</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Modern 3 Bedroom Apartment"
          placeholderTextColor={colors.placeholder}
          value={title}
          onChangeText={setTitle}
        />
      </View>

      <View style={styles.row}>
        <View style={[styles.fieldGroup, styles.halfField]}>
          <Text style={styles.label}>Price (ETB)</Text>
          <TextInput
            style={styles.input}
            placeholder="45000"
            placeholderTextColor={colors.placeholder}
            keyboardType="numeric"
            value={price}
            onChangeText={setPrice}
          />
        </View>
        <View style={[styles.fieldGroup, styles.halfField]}> 
          <Text style={styles.label}>Property Type</Text>
          <TextInput
            style={styles.input}
            placeholder="Apartment"
            placeholderTextColor={colors.placeholder}
            value={propertyType}
            onChangeText={setPropertyType}
          />
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Location</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Bole, Addis Ababa"
          placeholderTextColor={colors.placeholder}
          value={location}
          onChangeText={setLocation}
        />
      </View>

      <View style={styles.row}>
        <View style={[styles.fieldGroup, styles.smallField]}>
          <Text style={styles.label}>Bedrooms</Text>
          <TextInput
            style={styles.input}
            placeholder="3"
            placeholderTextColor={colors.placeholder}
            keyboardType="numeric"
            value={bedrooms}
            onChangeText={setBedrooms}
          />
        </View>
        <View style={[styles.fieldGroup, styles.smallField]}>
          <Text style={styles.label}>Bathrooms</Text>
          <TextInput
            style={styles.input}
            placeholder="2"
            placeholderTextColor={colors.placeholder}
            keyboardType="numeric"
            value={bathrooms}
            onChangeText={setBathrooms}
          />
        </View>
        <View style={[styles.fieldGroup, styles.smallField]}>
          <Text style={styles.label}>Area (m²)</Text>
          <TextInput
            style={styles.input}
            placeholder="120"
            placeholderTextColor={colors.placeholder}
            keyboardType="numeric"
            value={area}
            onChangeText={setArea}
          />
        </View>
      </View>

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.submitText}>Post Property</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
  },
  uploadCard: {
    height: 180,
    borderRadius: 24,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  uploadText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  uploadSubtext: {
    marginTop: 4,
    fontSize: 12,
    color: colors.primary,
    fontWeight: "700",
  },
  imagesList: {
    paddingBottom: 16,
  },
  thumbnailContainer: {
    position: "relative",
    marginRight: 10,
  },
  thumbnail: {
    width: 100,
    height: 100,
    borderRadius: 16,
    backgroundColor: colors.muted,
  },
  removeButton: {
    position: "absolute",
    top: -8,
    right: -8,
  },
  fieldGroup: {
    marginBottom: 18,
  },
  label: {
    marginBottom: 10,
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.muted,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  halfField: {
    width: "48%",
  },
  smallField: {
    width: "30%",
  },
  submitButton: {
    marginTop: 10,
    backgroundColor: colors.primary,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  submitText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: "800",
  },
});
