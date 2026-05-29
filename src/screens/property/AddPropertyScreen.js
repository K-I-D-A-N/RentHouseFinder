import React, { useMemo, useState, useEffect } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image, FlatList, Modal, KeyboardAvoidingView, SafeAreaView, Platform } from "react-native";
import { useTranslation } from "react-i18next";
import Icon from "react-native-vector-icons/MaterialIcons";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import useTheme from "../../hooks/useTheme";
import useAuth from "../../hooks/useAuth";
import { createProperty, getPropertyById, uploadListingImage } from "../../api/propertyApi";
import { getCategories } from "../../api/categoryApi";

export default function AddPropertyScreen({ navigation }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { role } = useAuth();
  
  // Check if user is landlord - show error if not
  if (role !== "landlord") {
    return (
      <View style={[createStyles(colors).container, { justifyContent: "center", alignItems: "center" }]}>
        <Ionicons name="lock-closed" size={64} color={colors.textSecondary} />
        <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.text, marginTop: 16, textAlign: "center" }}>
          {t("addProperty.landlordOnly.title")}
        </Text>
        <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: "center", paddingHorizontal: 20 }}>
          {t("addProperty.landlordOnly.message")}
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
    { label: t("addProperty.conditions.new"), value: "new" },
    { label: t("addProperty.conditions.like_new"), value: "like_new" },
    { label: t("addProperty.conditions.good"), value: "good" },
    { label: t("addProperty.conditions.fair"), value: "fair" },
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
        Alert.alert(t("addProperty.error.title"), t("addProperty.error.loadCategories"));
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
          Alert.alert(t("addProperty.permission.title"), t("addProperty.permission.camera"));
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
          Alert.alert(t("addProperty.permission.title"), t("addProperty.permission.gallery"));
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.7,
        });
      }

      if (!result.canceled && result.assets?.length) {
        console.log("Selected asset(s):", result.assets);
        const newImages = result.assets.map((asset) => {
          const uriParts = (asset.uri || "").split(".");
          const extension = uriParts[uriParts.length - 1]?.split("?")[0]?.toLowerCase();
          const imageType = asset.mimeType || (asset.type && asset.type.includes("/") ? asset.type : `image/${extension === "png" ? "png" : "jpeg"}`);
          const name = asset.fileName || `property_${Date.now()}.${extension || "jpg"}`;
          console.log("Prepared image metadata:", { uri: asset.uri, fileName: name, mimeType: imageType });
          return {
            uri: asset.uri,
            id: Date.now() + Math.random(),
            name,
            type: imageType,
          };
        });
        setImages([...images, ...newImages]);
      }
    } catch (error) {
      console.error("Image picker error:", error);
      Alert.alert(t("addProperty.error.title"), t("addProperty.error.pickImage"));
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      t("addProperty.imageSource.title"),
      t("addProperty.imageSource.message"),
      [
        { text: t("addProperty.imageSource.camera"), onPress: () => pickImage(true) },
        { text: t("addProperty.imageSource.gallery"), onPress: () => pickImage(false) },
        { text: t("addProperty.imageSource.cancel"), style: "cancel" },
      ]
    );
  };

  const removeImage = (id) => {
    setImages(images.filter((img) => img.id !== id));
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!title.trim()) {
      Alert.alert(t("addProperty.validation.title"), t("addProperty.validation.noTitle"));
      return;
    }
    if (!description.trim()) {
      Alert.alert(t("addProperty.validation.title"), t("addProperty.validation.noDescription"));
      return;
    }
    if (!pricePerDay && !pricePerWeek && !pricePerMonth) {
      Alert.alert(t("addProperty.validation.title"), t("addProperty.validation.noPrice"));
      return;
    }
    if (!depositAmount) {
      Alert.alert(t("addProperty.validation.title"), t("addProperty.validation.noDeposit"));
      return;
    }
    if (!condition || !conditionOptions.some(opt => opt.value === condition)) {
      Alert.alert(t("addProperty.validation.title"), t("addProperty.validation.noCondition"));
      return;
    }
    if (!city.trim()) {
      Alert.alert(t("addProperty.validation.title"), t("addProperty.validation.noCity"));
      return;
    }
    if (!address.trim()) {
      Alert.alert(t("addProperty.validation.title"), t("addProperty.validation.noAddress"));
      return;
    }
    if (!selectedCategoryId) {
      Alert.alert(t("addProperty.validation.title"), t("addProperty.validation.noCategory"));
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        price_per_day: pricePerDay ? Number(pricePerDay) : null,
        price_per_week: pricePerWeek ? Number(pricePerWeek) : null,
        price_per_month: pricePerMonth ? Number(pricePerMonth) : null,
        deposit_amount: Number(depositAmount),
        condition,
        city: city.trim(),
        address: address.trim(),
        category_id: selectedCategoryId,
      };

      const response = await createProperty(payload);
      const createdListing = response?.data;
      const listingId = createdListing?.id || createdListing?.listing?.id || createdListing?.pk || createdListing?.listing_id || createdListing?.data?.id;

      if (!listingId) {
        throw new Error("Unable to determine created listing ID.");
      }

      // Upload images separately after creating the listing
      if (images.length > 0) {
        console.log("AddPropertyScreen - images to upload:", images.map(i => ({ uri: i.uri, name: i.name, type: i.type })));
        for (const image of images) {
          if (!image?.uri) {
            console.warn("Skipping image without uri:", image);
            continue;
          }
          try {
            console.log("Uploading image for listing", listingId, image.uri, image.name, image.type);
            await uploadListingImage(listingId, image.uri, image.name, image.type);
          } catch (uploadError) {
            console.error("Failed to upload image:", image.uri, uploadError.response?.data || uploadError.message || uploadError);
            throw uploadError;
          }
        }

        // Refresh listing to ensure image fields are populated by backend
        try {
          await getPropertyById(listingId);
        } catch (refreshError) {
          console.warn("Failed to refresh listing after image upload", refreshError);
        }
      }

      console.log("Property created successfully!");
      Alert.alert(t("addProperty.success.title"), t("addProperty.success.message"));
      
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
      
      Alert.alert(t("addProperty.error.title"), errorMessage);
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
        <Text style={styles.headerTitle}>{t("addProperty.title")}</Text>
      </View>

      <TouchableOpacity style={styles.uploadCard} onPress={showImageOptions}>
        <Icon name="cloud-upload" size={36} color={colors.primary} />
        <Text style={styles.uploadText}>{t("addProperty.uploadImages")}</Text>
        {images.length > 0 && (
          <Text style={styles.uploadSubtext}>
            {images.length === 1
              ? t("addProperty.imagesAdded", { count: images.length })
              : t("addProperty.imagesAddedPlural", { count: images.length })}
          </Text>
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
        <Text style={styles.label}>{t("addProperty.propertyTitle")}</Text>
        <TextInput
          style={styles.input}
          placeholder={t("addProperty.titlePlaceholder")}
          placeholderTextColor={colors.placeholder}
          value={title}
          onChangeText={setTitle}
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>{t("addProperty.description")}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder={t("addProperty.descriptionPlaceholder")}
          placeholderTextColor={colors.placeholder}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>{t("addProperty.category")}</Text>
        <TouchableOpacity 
          style={[styles.input, { paddingVertical: 12, justifyContent: "center" }]}
          onPress={() => setShowCategoryModal(true)}
        >
          <View style={styles.pickerDisplay}>
            <Text style={[{ color: selectedCategoryId ? colors.text : colors.placeholder }]}>
              {selectedCategoryName || t("addProperty.selectCategory")}
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
              <Text style={styles.modalTitle}>{t("addProperty.selectCategoryTitle")}</Text>
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
                  {t("addProperty.noCategories")}
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
          <Text style={styles.label}>{t("addProperty.priceDay")}</Text>
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
          <Text style={styles.label}>{t("addProperty.priceWeek")}</Text>
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
        <Text style={styles.label}>{t("addProperty.priceMonth")}</Text>
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
        <Text style={styles.label}>{t("addProperty.deposit")}</Text>
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
        <Text style={styles.label}>{t("addProperty.condition")}</Text>
        <TouchableOpacity 
          style={[styles.input, { paddingVertical: 12, justifyContent: "center" }]}
          onPress={() => setShowConditionModal(true)}
        >
          <View style={styles.pickerDisplay}>
            <Text style={[{ color: condition ? colors.text : colors.placeholder }]}>
              {condition ? conditionOptions.find((opt) => opt.value === condition)?.label : t("addProperty.selectCondition")}
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
              <Text style={styles.modalTitle}>{t("addProperty.selectConditionTitle")}</Text>
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
          <Text style={styles.label}>{t("addProperty.city")}</Text>
          <TextInput
            style={styles.input}
            placeholder={t("addProperty.city")}
            placeholderTextColor={colors.placeholder}
            value={city}
            onChangeText={setCity}
          />
        </View>
        <View style={[styles.fieldGroup, styles.halfField]}>
          <Text style={styles.label}>{t("addProperty.address")}</Text>
          <TextInput
            style={styles.input}
            placeholder={t("addProperty.titlePlaceholder")}
            placeholderTextColor={colors.placeholder}
            value={address}
            onChangeText={setAddress}
          />
        </View>
      </View>

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.submitText}>{t("addProperty.submit")}</Text>}
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
