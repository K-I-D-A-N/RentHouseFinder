import React, { useState } from "react";
import { Image, View, Text, StyleSheet as RNStyleSheet } from "react-native";

export default function ImageWithFallback({ sourceUri, sourceObj, style, resizeMode = "contain", placeholderRequire, isFeatured, featuredUntil }) {
  const [failed, setFailed] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(null);
  const placeholder = placeholderRequire || require("../../assets/images/placeholder.jpg");

  const isCurrentlyFeatured = Boolean(isFeatured) && (!featuredUntil || new Date(featuredUntil) > new Date());
  const flattenedStyle = RNStyleSheet.flatten(style) || {};
  const aspectRatioStyle = aspectRatio && !flattenedStyle?.height ? { aspectRatio } : undefined;

  const imageSource = !sourceUri || failed ? placeholder : sourceObj || { uri: sourceUri };

  if (!sourceUri) console.log("ImageWithFallback - no sourceUri provided, using placeholder");
  if (failed) console.log("ImageWithFallback - image failed to load:", sourceUri);

  return (
    <View style={[styles.container, style]}>
      <Image
        source={imageSource}
        style={[styles.image, style, aspectRatioStyle]}
        resizeMode={resizeMode}
        onError={(error) => {
          console.log("ImageWithFallback - onError:", { uri: sourceUri, error });
          setFailed(true);
        }}
        onLoad={({ nativeEvent }) => {
          const width = nativeEvent?.source?.width;
          const height = nativeEvent?.source?.height;
          if (width && height) {
            setAspectRatio(width / height);
          }
          console.log("ImageWithFallback - image loaded successfully:", sourceUri, { width, height });
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

const styles = RNStyleSheet.create({
  container: { position: "relative" },
  image: { width: "100%" },
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
