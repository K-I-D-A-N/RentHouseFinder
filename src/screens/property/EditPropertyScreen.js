import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import useTheme from "../../hooks/useTheme";
import { getPropertyById, updateProperty } from "../../api/propertyApi";
import CustomButton from "../../components/CustomButton";

export default function EditPropertyScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { propertyId } = route.params || {};
  const { colors } = useTheme();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    property_type: "",
    location: "",
    bedrooms: "",
    bathrooms: "",
    square_feet: "",
    is_verified: false,
  });

  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    if (propertyId) {
      loadProperty();
    }
  }, [propertyId]);

  const loadProperty = async () => {
    try {
      setLoading(true);
      const response = await getPropertyById(propertyId);
      const data = response.data;
      setProperty(data);
      setFormData({
        title: data.title || "",
        description: data.description || "",
        price: String(data.price || ""),
        property_type: data.property_type || data.type || "",
        location: data.location || data.city || "",
        bedrooms: String(data.bedrooms || ""),
        bathrooms: String(data.bathrooms || ""),
        square_feet: String(data.square_feet || data.area || ""),
        is_verified: data.is_verified || data.verified || false,
      });
    } catch (error) {
      console.error("Failed to load property", error);
      Alert.alert(t("editProperty.error.title"), t("editProperty.error.loadFailed"));
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async () => {
    // Basic validation
    if (!formData.title.trim()) {
      Alert.alert(t("editProperty.validation.title"), t("editProperty.validation.noTitle"));
      return;
    }
    if (!formData.price.trim()) {
      Alert.alert(t("editProperty.validation.title"), t("editProperty.validation.noPrice"));
      return;
    }
    if (!formData.location.trim()) {
      Alert.alert(t("editProperty.validation.title"), t("editProperty.validation.noLocation"));
      return;
    }

    setSubmitting(true);
    try {
      const updateData = {
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price),
        property_type: formData.property_type,
        location: formData.location,
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
        bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : null,
        square_feet: formData.square_feet ? parseFloat(formData.square_feet) : null,
      };

      await updateProperty(propertyId, updateData);
      Alert.alert(t("editProperty.success.title"), t("editProperty.success.message"));
      navigation.goBack();
    } catch (error) {
      console.error("Failed to update property", error);
      const errorMessage =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        t("editProperty.error.updateFailed");
      Alert.alert(t("editProperty.error.title"), errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("editProperty.title")}</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.form}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>{t("editProperty.titleLabel")}</Text>
          <TextInput
            style={styles.input}
            placeholder={t("editProperty.placeholders.title")}
            placeholderTextColor={colors.textSecondary}
            value={formData.title}
            onChangeText={(value) => handleInputChange("title", value)}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>{t("editProperty.description")}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder={t("editProperty.placeholders.description")}
            placeholderTextColor={colors.textSecondary}
            value={formData.description}
            onChangeText={(value) => handleInputChange("description", value)}
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.rowContainer}>
          <View style={[styles.formGroup, styles.halfWidth]}>
            <Text style={styles.label}>{t("editProperty.price")}</Text>
            <TextInput
              style={styles.input}
              placeholder={t("editProperty.placeholders.price")}
              placeholderTextColor={colors.textSecondary}
              value={formData.price}
              onChangeText={(value) => handleInputChange("price", value)}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={[styles.formGroup, styles.halfWidth]}>
            <Text style={styles.label}>{t("editProperty.propertyType")}</Text>
            <TextInput
              style={styles.input}
              placeholder={t("editProperty.placeholders.propertyType")}
              placeholderTextColor={colors.textSecondary}
              value={formData.property_type}
              onChangeText={(value) => handleInputChange("property_type", value)}
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>{t("editProperty.location")}</Text>
          <TextInput
            style={styles.input}
            placeholder={t("editProperty.placeholders.location")}
            placeholderTextColor={colors.textSecondary}
            value={formData.location}
            onChangeText={(value) => handleInputChange("location", value)}
          />
        </View>

        <View style={styles.rowContainer}>
          <View style={[styles.formGroup, styles.halfWidth]}>
            <Text style={styles.label}>{t("editProperty.bedrooms")}</Text>
            <TextInput
              style={styles.input}
              placeholder={t("editProperty.placeholders.number")}
              placeholderTextColor={colors.textSecondary}
              value={formData.bedrooms}
              onChangeText={(value) => handleInputChange("bedrooms", value)}
              keyboardType="number-pad"
            />
          </View>
          <View style={[styles.formGroup, styles.halfWidth]}>
            <Text style={styles.label}>{t("editProperty.bathrooms")}</Text>
            <TextInput
              style={styles.input}
              placeholder={t("editProperty.placeholders.number")}
              placeholderTextColor={colors.textSecondary}
              value={formData.bathrooms}
              onChangeText={(value) => handleInputChange("bathrooms", value)}
              keyboardType="number-pad"
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>{t("editProperty.squareFeet")}</Text>
          <TextInput
            style={styles.input}
            placeholder={t("editProperty.placeholders.squareFeet")}
            placeholderTextColor={colors.textSecondary}
            value={formData.square_feet}
            onChangeText={(value) => handleInputChange("square_feet", value)}
            keyboardType="decimal-pad"
          />
        </View>

        <View style={styles.formGroup}>
          <View style={styles.switchContainer}>
            <Text style={styles.label}>{t("editProperty.verified")}</Text>
            <Switch
              value={formData.is_verified}
              onValueChange={(value) => handleInputChange("is_verified", value)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>
        </View>

        <CustomButton
          title={submitting ? t("editProperty.updating") : t("editProperty.updateButton")}
          onPress={handleSubmit}
          disabled={submitting}
          style={styles.submitButton}
        />
      </View>
    </ScrollView>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.muted,
    },
    contentContainer: {
      paddingBottom: 30,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.muted,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border || colors.muted,
    },
    backButton: {
      padding: 8,
      marginLeft: -8,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: "700",
      color: colors.text,
    },
    form: {
      padding: 16,
    },
    formGroup: {
      marginBottom: 20,
    },
    rowContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 20,
    },
    halfWidth: {
      flex: 0.48,
    },
    label: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 8,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border || colors.muted,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 12,
      fontSize: 14,
      color: colors.text,
      backgroundColor: colors.surface,
    },
    textArea: {
      minHeight: 100,
      paddingTop: 12,
      textAlignVertical: "top",
    },
    switchContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    submitButton: {
      marginTop: 8,
      marginBottom: 20,
    },
  });
