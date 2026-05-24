import React, { useState } from "react";
import { Image } from "react-native";

export default function ImageWithFallback({ sourceUri, sourceObj, style, resizeMode = "cover", placeholderRequire }) {
  const [failed, setFailed] = useState(false);
  const placeholder = placeholderRequire || require("../../assets/images/placeholder.jpg");

  if (!sourceUri || failed) {
    return <Image source={placeholder} style={style} resizeMode={resizeMode} />;
  }

  return (
    <Image
      source={sourceObj || { uri: sourceUri }}
      style={style}
      resizeMode={resizeMode}
      onError={() => setFailed(true)}
    />
  );
}
