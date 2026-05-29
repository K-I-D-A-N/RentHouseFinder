import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import useTheme from "../../hooks/useTheme";
import { getPropertyById, updateProperty } from "../../api/propertyApi";
import { getCategories } from "../../api/categoryApi";

export default function EditListingScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { listingId, slug, listingData } = route.params || {};
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Form state
  const [title, setTitle] = useState(listingData?.title || "");
  const [description, setDescription] = useState(listingData?.description || "");
  const [price, setPrice] = useState(
    listingData?.price_per_month || listingData?.price_per_week || listingData?.price_per_day || listingData?.price || ""
  );
  const [city, setCity] = useState(listingData?.city || "");
  const [condition, setCondition] = useState(listingData?.condition || "");
  const [categoryId, setCategoryId] = useState(listingData?.category_id || listingData?.category || "");
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [images, setImages] = useState(listingData?.images || []);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  // Canonical condition options (must match backend values)
  const conditionOptions = [
    { label: t("editListing.conditions.new"), value: "new" },
    { label: t("editListing.conditions.like_new"), value: "like_new" },
    { label: t("editListing.conditions.good"), value: "good" },
    { label: t("editListing.conditions.fair"), value: "fair" },
  ];
  const normalizeCondition = (val) => {
    if (!val && val !== "") return "";
    const raw = String(val || "").trim();
    if (!raw) return "";
    // exact match to allowed value
    if (conditionOptions.some((o) => o.value === raw)) return raw;
    // normalize common label formats to value: spaces -> underscore, lowercase
    const transformed = raw.toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
    if (conditionOptions.some((o) => o.value === transformed)) return transformed;
    // match by label
    const byLabel = conditionOptions.find((o) => o.label.toLowerCase() === raw.toLowerCase());
    if (byLabel) return byLabel.value;
    return raw;
  };

  // Ensure initial listingData condition is normalized to backend value
  useEffect(() => {
    if (listingData?.condition) {
      setCondition(normalizeCondition(listingData.condition));
    }
  }, [listingData]);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setCategoriesLoading(true);
        const response = await getCategories();
        setCategories(response.data || []);
      } catch (error) {
        Alert.alert(t("editListing.error.title"), t("editListing.error.loadCategories"));
      } finally {
        setCategoriesLoading(false);
      }
    };
    fetchCategories();
  }, []);

  // Fetch latest listing data if not passed
  useEffect(() => {
    if (!listingData && slug) {
      setFetching(true);
      getPropertyById(slug)
        .then((res) => {
          const d = res.data;
          setTitle(d.title || "");
          setDescription(d.description || "");
          setPrice(d.price_per_month || d.price_per_week || d.price_per_day || d.price || "");
          setCity(d.city || "");
          setCondition(normalizeCondition(d.condition || ""));
          setCategoryId(d.category_id || d.category || "");
          setImages(d.images || []);
        })
        .catch(() => Alert.alert(t("editListing.error.title"), t("editListing.error.fetchListing")))
        .finally(() => setFetching(false));
    }
  }, [listingData, slug]);

  // Save changes
  const handleSave = async () => {
    if (!title.trim() || !description.trim() || !price || !city.trim() || !condition || !categoryId) {
      Alert.alert(t("editListing.validation.title"), t("editListing.validation.message"));
      return;
    }
    // Ensure condition is one of the allowed backend values
    const allowedConditions = conditionOptions.map((o) => o.value);
    if (!allowedConditions.includes(condition)) {
      Alert.alert(t("editListing.validation.title"), t("editListing.validation.invalidCondition"));
      return;
    }
    setLoading(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        price: Number(price),
        city: city.trim(),
        condition,
        category_id: categoryId,
      };
      await updateProperty(listingId, payload);
      Alert.alert(t("editListing.success.title"), t("editListing.success.message"), [
        {
          text: "OK",
          onPress: () => {
            // Trigger Home tab refresh (if parent tab navigator exists)
            try {
              navigation.getParent()?.navigate("HomeTab", { screen: "Home" });
            } catch (e) {
              // ignore navigation errors
            }
            navigation.goBack();
          },
        },
      ]);
    } catch (error) {
      let msg = "Failed to update listing.";
      if (error.response?.data) {
        const data = error.response.data;
        if (typeof data === "string") msg = data;
        else if (data.detail) msg = data.detail;
        else if (data.message) msg = data.message;
        else if (typeof data === "object") {
          const firstError = Object.values(data)[0];
          if (Array.isArray(firstError)) msg = firstError[0];
          else msg = JSON.stringify(data);
        }
      } else if (error.message) {
        msg = error.message;
      }
      Alert.alert(t("editListing.error.title"), msg);
    } finally {
      setLoading(false);
    }
  };

  // UI
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={80}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.header}>{t("editListing.title")}</Text>
        {(fetching || categoriesLoading) && (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 20 }} />
        )}
        {/* Images Preview */}
        {images && images.length > 0 && (
          <ScrollView horizontal style={styles.imagesRow}>
            {images.map((img, idx) => {
              let uri = img.url || img.image || img.uri || img;
              return (
                <Image
                  key={idx}
                  source={{ uri: uri }}
                  style={styles.imageThumb}
                  resizeMode="cover"
                />
              );
            })}
          </ScrollView>
        )}
        {/* Title */}
        <Text style={styles.label}>{t("editListing.titleLabel")}</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder={t("editListing.titleLabel")}
          placeholderTextColor={colors.placeholder}
        />
        {/* Description */}
        <Text style={styles.label}>{t("editListing.description")}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder={t("editListing.description")}
          placeholderTextColor={colors.placeholder}
          multiline
          numberOfLines={4}
        />
        {/* Price */}
        <Text style={styles.label}>{t("editListing.price")}</Text>
        <TextInput
          style={styles.input}
          value={String(price)}
          onChangeText={setPrice}
          placeholder={t("editListing.price")}
          placeholderTextColor={colors.placeholder}
          keyboardType="numeric"
        />
        {/* City */}
        <Text style={styles.label}>{t("editListing.city")}</Text>
        <TextInput
          style={styles.input}
          value={city}
          onChangeText={setCity}
          placeholder={t("editListing.city")}
          placeholderTextColor={colors.placeholder}
        />
        {/* Category */}
        <Text style={styles.label}>{t("editListing.category")}</Text>
        <View style={styles.pickerWrapper}>
          {categoriesLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.pickerOption,
                  categoryId === cat.id && styles.pickerOptionSelected,
                ]}
                onPress={() => setCategoryId(cat.id)}
              >
                <Text
                  style={[
                    styles.pickerOptionText,
                    categoryId === cat.id && styles.pickerOptionTextSelected,
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>
        {/* Condition */}
        <Text style={styles.label}>{t("editListing.condition")}</Text>
        <View style={styles.pickerWrapper}>
          {conditionOptions.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.pickerOption,
                condition === opt.value && styles.pickerOptionSelected,
              ]}
              onPress={() => setCondition(opt.value)}
            >
              <Text
                style={[
                  styles.pickerOptionText,
                  condition === opt.value && styles.pickerOptionTextSelected,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>{t("editListing.saveButton")}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      padding: 20,
      backgroundColor: colors.muted,
      flexGrow: 1,
    },
    header: {
      fontSize: 24,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 20,
      textAlign: "center",
    },
    label: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
      marginTop: 16,
      marginBottom: 4,
    },
    input: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 12,
      fontSize: 15,
      color: colors.text,
      marginBottom: 4,
    },
    textArea: {
      minHeight: 80,
      textAlignVertical: "top",
    },
    pickerWrapper: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginBottom: 8,
    },
    pickerOption: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 6,
      marginRight: 8,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pickerOptionSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    pickerOptionText: {
      color: colors.textSecondary,
      fontWeight: "500",
    },
    pickerOptionTextSelected: {
      color: "#fff",
      fontWeight: "700",
    },
    saveButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 24,
    },
    saveButtonDisabled: {
      opacity: 0.6,
    },
    saveButtonText: {
      color: "#fff",
      fontWeight: "700",
      fontSize: 17,
    },
    imagesRow: {
      flexDirection: "row",
      marginBottom: 12,
    },
    imageThumb: {
      width: 80,
      height: 80,
      borderRadius: 8,
      marginRight: 8,
      backgroundColor: colors.surface,
    },
  });
