import React, { useState } from "react";
import { Image, View, Text, StyleSheet } from "react-native";

export default function ImageWithFallback({ sourceUri, sourceObj, style, resizeMode = "cover", placeholderRequire, isFeatured, featuredUntil }) {
  const [failed, setFailed] = useState(false);
  const placeholder = placeholderRequire || require("../../assets/images/placeholder.jpg");

  const isCurrentlyFeatured = Boolean(isFeatured) && (!featuredUntil || new Date(featuredUntil) > new Date());

  const imageSource = !sourceUri || failed ? placeholder : sourceObj || { uri: sourceUri };

  if (!sourceUri) console.log("ImageWithFallback - no sourceUri provided, using placeholder");
  if (failed) console.log("ImageWithFallback - image failed to load:", sourceUri);

  return (
    <View style={[styles.container, style]}>
      <Image
        source={imageSource}
        style={[styles.image, style]}
        resizeMode={resizeMode}
        onError={(error) => {
          console.log("ImageWithFallback - onError:", { uri: sourceUri, error });
          setFailed(true);
        }}
        onLoad={() => {
          console.log("ImageWithFallback - image loaded successfully:", sourceUri);
        }}
      />
      {isCurrentlyFeatured && (
        <View style={styles.featuredBadge} pointerEvents="none">
          <Text style={styles.featuredText}>⭐ Featured</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: "relative" },
  image: { width: "100%", height: "100%" },
  featuredBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  featuredText: { color: "#fff", fontWeight: "700", fontSize: 12 },
});
