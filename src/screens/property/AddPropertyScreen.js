import React, { useMemo, useState, useEffect } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image, FlatList, Modal, KeyboardAvoidingView, SafeAreaView, Platform } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import useTheme from "../../hooks/useTheme";
import useAuth from "../../hooks/useAuth";
import { createProperty } from "../../api/propertyApi";
import { getCategories } from "../../api/categoryApi";

export default function AddPropertyScreen({ navigation }) {
  const { colors } = useTheme();
  const { role } = useAuth();
  
  // Check if user is landlord - show error if not
  if (role !== "landlord") {
    return (
      <View style={[createStyles(colors).container, { justifyContent: "center", alignItems: "center" }]}>
        <Ionicons name="lock-closed" size={64} color={colors.textSecondary} />
        <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.text, marginTop: 16, textAlign: "center" }}>
          Landlord Only
        </Text>
        <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: "center", paddingHorizontal: 20 }}>
          Only landlord accounts can create and manage property listings.
        </Text>
      </View>
    );
  }

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pricePerDay, setPricePerDay] = useState("");
  const [pricePerWeek, setPricePerWeek] = useState("");
  const [pricePerMonth, setPricePerMonth] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [condition, setCondition] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedCategoryName, setSelectedCategoryName] = useState("");
  
  // Categories and UI state
  const [categories, setCategories] = useState([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [showConditionModal, setShowConditionModal] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState([]);
  
  const styles = useMemo(() => createStyles(colors), [colors]);
  
  // Use only backend-accepted values for property condition (requested values)
  const conditionOptions = [
    { label: "New", value: "new" },
    { label: "Like New", value: "like_new" },
    { label: "Good", value: "good" },
    { label: "Fair", value: "fair" },
  ];
  
  // Fetch categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setCategoriesLoading(true);
        const response = await getCategories();
        setCategories(response.data || []);
      } catch (error) {
        console.error("Failed to fetch categories:", error);
        Alert.alert("Error", "Failed to load property categories.");
      } finally {
        setCategoriesLoading(false);
      }
    };
    fetchCategories();
  }, []);

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
    // Validate required fields
    if (!title.trim()) {
      Alert.alert("Validation", "Please enter a property title.");
      return;
    }
    if (!description.trim()) {
      Alert.alert("Validation", "Please enter a property description.");
      return;
    }
    if (!pricePerDay && !pricePerWeek && !pricePerMonth) {
      Alert.alert("Validation", "Please enter at least one price (daily, weekly, or monthly).");
      return;
    }
    if (!depositAmount) {
      Alert.alert("Validation", "Please enter a deposit amount.");
      return;
    }
    if (!condition || !conditionOptions.some(opt => opt.value === condition)) {
      Alert.alert("Validation", "Please select a valid property condition.");
      return;
    }
    if (!city.trim()) {
      Alert.alert("Validation", "Please enter a city.");
      return;
    }
    if (!address.trim()) {
      Alert.alert("Validation", "Please enter an address.");
      return;
    }
    if (!selectedCategoryId) {
      Alert.alert("Validation", "Please select a property category.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      
      // Add all required fields
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      formData.append("price_per_day", pricePerDay ? Number(pricePerDay) : null);
      formData.append("price_per_week", pricePerWeek ? Number(pricePerWeek) : null);
      formData.append("price_per_month", pricePerMonth ? Number(pricePerMonth) : null);
      formData.append("deposit_amount", Number(depositAmount));
      formData.append("condition", condition);
      formData.append("city", city.trim());
      formData.append("address", address.trim());
      formData.append("category_id", selectedCategoryId);

      // Add images if any
      if (images.length > 0) {
        images.forEach((image, index) => {
          formData.append("images", {
            uri: image.uri,
            type: "image/jpeg",
            name: `property_${index}_${Date.now()}.jpg`,
          });
        });
      }

      await createProperty(formData);
      Alert.alert("Success", "Property posted successfully!");
      
      // Reset form
      setTitle("");
      setDescription("");
      setPricePerDay("");
      setPricePerWeek("");
      setPricePerMonth("");
      setDepositAmount("");
      setCondition("");
      setCity("");
      setAddress("");
      setSelectedCategoryId("");
      setSelectedCategoryName("");
      setImages([]);
      
      navigation.goBack();
    } catch (error) {
      console.error("Failed to post property:", error);
      
      // Parse error message
      let errorMessage = "Unable to post property.";
      if (error.response?.data) {
        const data = error.response.data;
        if (typeof data === "string") {
          errorMessage = data;
        } else if (data.detail) {
          errorMessage = data.detail;
        } else if (data.message) {
          errorMessage = data.message;
        } else if (typeof data === "object") {
          // Extract first error from field errors
          const firstError = Object.values(data)[0];
          if (Array.isArray(firstError)) {
            errorMessage = firstError[0];
          } else {
            errorMessage = JSON.stringify(data);
          }
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert("Submission Failed", errorMessage);
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
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={80}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView contentContainerStyle={[styles.container, { paddingBottom: 140 }]} keyboardShouldPersistTaps="handled">
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

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe your property in detail..."
          placeholderTextColor={colors.placeholder}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Category</Text>
        <TouchableOpacity 
          style={[styles.input, { paddingVertical: 12, justifyContent: "center" }]}
          onPress={() => setShowCategoryModal(true)}
        >
          <View style={styles.pickerDisplay}>
            <Text style={[{ color: selectedCategoryId ? colors.text : colors.placeholder }]}>
              {selectedCategoryName || "Select Category"}
            </Text>
            <Icon name="arrow-drop-down" size={20} color={colors.textSecondary} />
          </View>
        </TouchableOpacity>
        <Modal
          visible={showCategoryModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowCategoryModal(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowCategoryModal(false)}
          >
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <Text style={styles.modalTitle}>Select Category</Text>
              {categoriesLoading ? (
                <ActivityIndicator color={colors.primary} size="large" style={{ paddingVertical: 20 }} />
              ) : categories.length > 0 ? (
                categories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.optionItem,
                      selectedCategoryId === category.id && styles.optionItemSelected
                    ]}
                    onPress={() => {
                      setSelectedCategoryId(category.id);
                      setSelectedCategoryName(category.name);
                      setShowCategoryModal(false);
                    }}
                  >
                    <Icon 
                      name={selectedCategoryId === category.id ? "radio-button-checked" : "radio-button-unchecked"} 
                      size={20} 
                      color={selectedCategoryId === category.id ? colors.primary : colors.textSecondary}
                    />
                    <Text style={[styles.optionText, { color: colors.text }]}>
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={{ color: colors.text, textAlign: "center", paddingVertical: 20 }}>
                  No categories available
                </Text>
              )}
              <TouchableOpacity 
                style={[styles.button, { marginTop: 16, backgroundColor: colors.textSecondary }]}
                onPress={() => setShowCategoryModal(false)}
              >
                <Text style={styles.buttonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>

      <View style={styles.row}>
        <View style={[styles.fieldGroup, styles.halfField]}>
          <Text style={styles.label}>Price/Day (ETB)</Text>
          <TextInput
            style={styles.input}
            placeholder="5000"
            placeholderTextColor={colors.placeholder}
            keyboardType="numeric"
            value={pricePerDay}
            onChangeText={setPricePerDay}
          />
        </View>
        <View style={[styles.fieldGroup, styles.halfField]}>
          <Text style={styles.label}>Price/Week (ETB)</Text>
          <TextInput
            style={styles.input}
            placeholder="30000"
            placeholderTextColor={colors.placeholder}
            keyboardType="numeric"
            value={pricePerWeek}
            onChangeText={setPricePerWeek}
          />
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Price/Month (ETB)</Text>
        <TextInput
          style={styles.input}
          placeholder="100000"
          placeholderTextColor={colors.placeholder}
          keyboardType="numeric"
          value={pricePerMonth}
          onChangeText={setPricePerMonth}
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Deposit Amount (ETB)</Text>
        <TextInput
          style={styles.input}
          placeholder="50000"
          placeholderTextColor={colors.placeholder}
          keyboardType="numeric"
          value={depositAmount}
          onChangeText={setDepositAmount}
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Property Condition</Text>
        <TouchableOpacity 
          style={[styles.input, { paddingVertical: 12, justifyContent: "center" }]}
          onPress={() => setShowConditionModal(true)}
        >
          <View style={styles.pickerDisplay}>
            <Text style={[{ color: condition ? colors.text : colors.placeholder }]}>
              {condition ? condition.charAt(0).toUpperCase() + condition.slice(1) : "Select Condition"}
            </Text>
            <Icon name="arrow-drop-down" size={20} color={colors.textSecondary} />
          </View>
        </TouchableOpacity>
        <Modal
          visible={showConditionModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowConditionModal(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowConditionModal(false)}
          >
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <Text style={styles.modalTitle}>Select Condition</Text>
              {conditionOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionItem,
                    condition === option.value && styles.optionItemSelected
                  ]}
                  onPress={() => {
                    setCondition(option.value);
                    setShowConditionModal(false);
                  }}
                >
                  <Icon 
                    name={condition === option.value ? "radio-button-checked" : "radio-button-unchecked"} 
                    size={20} 
                    color={condition === option.value ? colors.primary : colors.textSecondary}
                  />
                  <Text style={[styles.optionText, { color: colors.text }]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity 
                style={[styles.button, { marginTop: 16, backgroundColor: colors.textSecondary }]}
                onPress={() => setShowConditionModal(false)}
              >
                <Text style={styles.buttonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>

      <View style={styles.row}>
        <View style={[styles.fieldGroup, styles.halfField]}>
          <Text style={styles.label}>City</Text>
          <TextInput
            style={styles.input}
            placeholder="Addis Ababa"
            placeholderTextColor={colors.placeholder}
            value={city}
            onChangeText={setCity}
          />
        </View>
        <View style={[styles.fieldGroup, styles.halfField]}>
          <Text style={styles.label}>Address</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Bole, Woliso St."
            placeholderTextColor={colors.placeholder}
            value={address}
            onChangeText={setAddress}
          />
        </View>
      </View>

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.submitText}>Post Property</Text>}
      </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
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
  textArea: {
    height: 120,
    textAlignVertical: "top",
    paddingVertical: 12,
  },
  pickerDisplay: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
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
    backgroundColor: colors.primaryDark,
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
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  buttonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    borderRadius: 16,
    padding: 20,
    width: "85%",
    maxWidth: 450,
    maxHeight: "80%",
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: 16,
    textAlign: "center",
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionItemSelected: {
    backgroundColor: "rgba(255, 107, 0, 0.1)",
    borderColor: colors.primary,
  },
  optionText: {
    fontSize: 16,
    flex: 1,
    marginLeft: 12,
  },
});
