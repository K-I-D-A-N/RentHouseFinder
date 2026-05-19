import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, StyleSheet, Image, TouchableOpacity, Dimensions } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { getPropertyById } from "../../api/propertyApi";

const { width } = Dimensions.get("window");

export default function PropertyDetailScreen({ route, navigation }) {
  const { id } = route.params || {};
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProperty = async () => {
      try {
        const response = await getPropertyById(id);
        setProperty(response.data);
      } catch (error) {
        console.error("Failed to load property", error);
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      loadProperty();
    } else {
      setLoading(false);
    }
  }, [id]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!property) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Property details unavailable.</Text>
      </View>
    );
  }

  const images = property.images || [property.image || "https://via.placeholder.com/400x300?text=No+Image"];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ScrollView horizontal pagingEnabled style={styles.imageCarousel}>
          {images.map((img, index) => (
            <Image key={index} source={{ uri: img }} style={styles.image} resizeMode="cover" />
          ))}
        </ScrollView>
        <View style={styles.content}>
          <Text style={styles.price}>${property.price || "N/A"}</Text>
          <Text style={styles.title}>{property.title || "Property"}</Text>
          <Text style={styles.location}>{property.location || "Location not available"}</Text>
          <View style={styles.detailsSection}>
            <Text style={styles.sectionTitle}>Details</Text>
            <Text style={styles.description}>{property.description || "No description provided."}</Text>
            <View style={styles.features}>
              <View style={styles.feature}>
                <Icon name="king-bed" size={20} color="#666" />
                <Text style={styles.featureText}>{property.bedrooms || 0} Bedrooms</Text>
              </View>
              <View style={styles.feature}>
                <Icon name="bathtub" size={20} color="#666" />
                <Text style={styles.featureText}>{property.bathrooms || 0} Bathrooms</Text>
              </View>
              <View style={styles.feature}>
                <Icon name="square-foot" size={20} color="#666" />
                <Text style={styles.featureText}>{property.area || "N/A"} sq ft</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
      <View style={styles.bookingSection}>
        <TouchableOpacity style={styles.contactButton}>
          <Text style={styles.contactButtonText}>Contact Owner</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bookButton} onPress={() => navigation.navigate("Booking", { propertyId: property.id })}>
          <Text style={styles.bookButtonText}>Book Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    flexGrow: 1,
  },
  imageCarousel: {
    height: 300,
  },
  image: {
    width: width,
    height: 300,
  },
  content: {
    padding: 24,
  },
  price: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#007bff",
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  location: {
    fontSize: 16,
    color: "#666",
    marginBottom: 24,
  },
  detailsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: "#555",
    lineHeight: 24,
    marginBottom: 16,
  },
  features: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  feature: {
    alignItems: "center",
  },
  featureText: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  bookingSection: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  contactButton: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginRight: 8,
  },
  contactButtonText: {
    color: "#333",
    fontWeight: "bold",
  },
  bookButton: {
    flex: 1,
    backgroundColor: "#007bff",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  bookButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    color: "#666",
    fontSize: 16,
  },
});