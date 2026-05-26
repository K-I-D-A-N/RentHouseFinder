import React, { useState } from "react";
import { Image } from "react-native";

export default function ImageWithFallback({ sourceUri, sourceObj, style, resizeMode = "cover", placeholderRequire }) {
  const [failed, setFailed] = useState(false);
  const placeholder = placeholderRequire || require("../../assets/images/placeholder.jpg");

  if (!sourceUri || failed) {
    if (!sourceUri) {
      console.log("ImageWithFallback - no sourceUri provided, using placeholder");
    }
    if (failed) {
      console.log("ImageWithFallback - image failed to load:", sourceUri);
    }
    return <Image source={placeholder} style={style} resizeMode={resizeMode} />;
  }

  console.log("ImageWithFallback - loading image from URI:", sourceUri);

  return (
    <Image
      source={sourceObj || { uri: sourceUri }}
      style={style}
      resizeMode={resizeMode}
      onError={(error) => {
        console.log("ImageWithFallback - onError:", { uri: sourceUri, error });
        setFailed(true);
      }}
      onLoad={() => {
        console.log("ImageWithFallback - image loaded successfully:", sourceUri);
      }}
    />
  );
}
