import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Platform,
  Alert,
} from "react-native";
import { useTranslation } from "react-i18next";
import { MaterialIcons as Icon } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import useTheme from "../../hooks/useTheme";
import useAuth from "../../hooks/useAuth";
import api from "../../api/axiosConfig";
import { getListingReviews, getListingReviewStats } from "../../api/reviewApi";
import { getPrimaryImageUrl, getOwnerField } from "../../utils/dataHelpers";
import { isPremiumCustomer } from "../../utils/premiumHelpers";
import ImageWithFallback from "../../components/ImageWithFallback";

const { width } = Dimensions.get("window");

const renderStars = (rating) => {
  const normalized = Math.max(0, Math.min(5, Math.round(rating || 0)));
  return Array.from({ length: 5 }, (_, index) => (
    <Icon
      key={`star-${index}`}
      name={index < normalized ? "star" : "star-border"}
      size={18}
      color={index < normalized ? "#f5a623" : "#c1c1c1"}
      style={styles.starIcon}
    />
  ));
};

export default function PropertyDetailScreen({ route, navigation }) {
  const { t } = useTranslation();
  const { slug, id, image: routeImage, title: routeTitle, pricePerDay: routePricePerDay } = route.params || {};
  const { colors } = useTheme();
  const { role, user } = useAuth();
  const [property, setProperty] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewStats, setReviewStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);

  const fetchProperty = useCallback(async () => {
    setError("");
    setLoading(true);
    console.log("SLUG:", slug);
    console.log("LISTING ID:", id);

    try {
      if (!slug && !id) {
        console.log("ERROR: slug and id are both undefined");
        throw new Error("Listing slug or id is required to fetch details.");
      }

      const detailKey = slug || id;
      const response = await api.get(`/listings/${detailKey}/`);
      const propertyData = response.data;
      setProperty(propertyData);
      const reviewListingId = id || propertyData.id || propertyData.pk;

      if (reviewListingId) {
        console.log("LISTING ID for reviews:", reviewListingId);
        const reviewResponse = await getListingReviews(reviewListingId);
        const reviewPayload = reviewResponse.data;
        const normalizedReviews =
          reviewPayload?.items ||
          reviewPayload?.results ||
          (Array.isArray(reviewPayload) ? reviewPayload : []);
        setReviews(normalizedReviews);
        try {
          const statsResponse = await getListingReviewStats(reviewListingId);
          setReviewStats(statsResponse.data);
        } catch (sErr) {
          console.warn("Failed to fetch review stats", sErr.response?.data || sErr.message || sErr);
          setReviewStats(null);
        }
      } else {
        console.log("ERROR: listingId is undefined for reviews");
        setReviews([]);
      }
    } catch (fetchError) {
      console.error("Property detail fetch failed", fetchError.response?.data || fetchError.message || fetchError);
      setError(t("propertyDetail.error"));
      setProperty(null);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [slug, id]);

  useFocusEffect(
    useCallback(() => {
      fetchProperty();
    }, [fetchProperty])
  );

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}> 
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background, padding: 24 }]}> 
        <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
      </View>
    );
  }

  if (!property) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}> 
        <Text style={[styles.emptyText, { color: colors.text }]}>{t("propertyDetail.unavailableDetails")}</Text>
      </View>
    );
  }

  const makeImageUri = (image) => {
    if (!image) return "";
    if (typeof image === "string") return image;
    if (typeof image === "object") return image.uri || image.url || image.path || "";
    return String(image);
  };

  // Normalize image URLs to include base URL
  const normalizeUrl = (url) => {
    if (!url || typeof url !== "string") return "";
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith("/")) return `https://betrent-u5jj.onrender.com${url}`;
    return `https://betrent-u5jj.onrender.com/${url}`;
  };

  const primary = getPrimaryImageUrl(property)
    || normalizeUrl(makeImageUri(routeImage))
    || normalizeUrl(makeImageUri(property.primary_image_url))
    || normalizeUrl(makeImageUri(property.image_url))
    || normalizeUrl(makeImageUri(property.image))
    || normalizeUrl(makeImageUri(property.cover_image))
    || "";

  const extraImages = Array.isArray(property.images)
    ? property.images
        .map((i) => normalizeUrl(i?.image_url || i?.url || i?.image || i?.uri || ""))
        .filter(Boolean)
    : [];
  const heroImages = primary ? [primary, ...extraImages.filter((u) => u !== primary)] : extraImages.length ? extraImages : ["https://via.placeholder.com/1080x720?text=No+Image"];

  // Check if property is rented
  const isRented = (() => {
    // Explicit rented flag
    if (property.is_rented === true) return true;
    if (property.rented === true) return true;
    
    // Status field check - multiple possible values
    if (typeof property.status === "string") {
      const statusLower = property.status.toLowerCase();
      if (/rented|occupied|booked|unavailable/i.test(statusLower)) {
        console.log("DEBUG: Property marked as rented via status:", property.status);
        return true;
      }
    }
    
    // Availability checks
    if (property.is_available === false) {
      console.log("DEBUG: Property marked as rented via is_available=false");
      return true;
    }
    if (property.available === false) {
      console.log("DEBUG: Property marked as rented via available=false");
      return true;
    }
    
    // Check nested bookings from backend
    const bookings = property.bookings || property.booking_set || property.active_bookings || [];
    if (Array.isArray(bookings) && bookings.length > 0) {
      for (const b of bookings) {
        const bStatus = String(b?.status || "").toLowerCase();
        const paymentStatus = String(b?.payment_status || b?.payment?.status || "").toLowerCase();
        if (bStatus === "completed" || bStatus === "rented" || bStatus === "approved") {
          if (paymentStatus === "paid" || paymentStatus === "completed") {
            console.log("DEBUG: Property marked as rented via booking:", bStatus, paymentStatus);
            return true;
          }
        }
      }
    }
    
    console.log("DEBUG: Property is available - no rented indicators found");
    return false;
  })();

  const availability = !isRented &&
    (property.is_available ?? property.available ??
    (typeof property.status === "string" ? property.status.toLowerCase().includes("available") : undefined) ??
    true);

  const makeString = (value) => {
    if (value == null) return "";
    if (typeof value === "string" || typeof value === "number") return String(value);
    if (typeof value === "object") return value.name || value.slug || value.description || JSON.stringify(value);
    return "";
  };

  const description = property.description || property.summary || property.details || t("propertyDetail.noDescription");
  const owner = property.owner || property.host || {};
  const ownerName = getOwnerField(property, "full_name");
  const ownerEmail = getOwnerField(property, "email");
  const category = makeString(property.category || property.property_type || property.type) || t("propertyDetail.categoryUnknown");
  const location = makeString(property.location || property.city || property.address) || t("propertyDetail.locationUnavailable");
  const priceLabel = property.price_per_day
    ? `ETB ${Number(property.price_per_day).toLocaleString()} ${t("propertyDetail.perDaySuffix")}`
    : property.price
    ? `ETB ${Number(property.price).toLocaleString()} ${t("propertyDetail.perMonthSuffix")}`
    : "Price unavailable";
  const views = property.views || property.view_count || property.viewCount;
  const currentListingId = property.id || property.pk || id;
  const bookImage = heroImages[0];

  const isLandlord = role?.toLowerCase() === "landlord";
  const isCustomer = role?.toLowerCase() === "customer";
  const isPremiumLocked = property.requires_premium === true && isCustomer && !isPremiumCustomer(user);
  const canBook = availability && !isLandlord && !isPremiumLocked;

  const handleUpgrade = () => {
    Alert.alert(
      t("propertyDetail.upgradeAlertTitle"),
      t("propertyDetail.upgradeAlertMessage"),
      [
        { text: t("addProperty.imageSource.cancel"), style: "cancel" },
        {
          text: t("propertyDetail.upgradeToPremium"),
          onPress: () => navigation.navigate("Profile"),
        },
      ]
    );
  };

  const handleBookNow = () => {
    if (!currentListingId) return;
    if (isRented) {
      Alert.alert(t("propertyDetail.rentedAlert.title"), t("propertyDetail.rentedAlert.message"));
      return;
    }
    if (!canBook) return;
    const bookingImage = heroImages[0] || routeImage;
    const bookingTitle = property.title || property.name || routeTitle || t("propertyDetail.bookingFallback");
    const bookingPrice = routePricePerDay || property.price_per_day || property.price || 0;
    console.log("BOOK NOW listingId:", currentListingId);
    navigation.navigate("HomeTab", {
      screen: "BookingScreen",
      params: {
        listingId: currentListingId,
        image: bookingImage,
        title: bookingTitle,
        pricePerDay: bookingPrice,
      },
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <FlatList
        data={heroImages}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, index) => `hero-${index}`}
        renderItem={({ item }) => (
          <ImageWithFallback sourceUri={item} style={styles.heroImage} isFeatured={property?.is_featured} featuredUntil={property?.featured_until} />
        )}
        style={styles.gallery}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.metaRow}>
          <View style={styles.metaLeft}>
            <Text style={[styles.categoryText, { backgroundColor: colors.surface }]}>{category}</Text>
            <Text style={[styles.priceText, { color: colors.primary }]}>{priceLabel}</Text>
          </View>
          <View style={styles.metaRight}>
            <View style={[styles.statusPill, { backgroundColor: isRented ? "#fee2e2" : availability ? "#dff6e7" : "#f8d7da" }]}> 
              <Text style={[styles.statusText, { color: isRented ? "#9f1239" : availability ? "#1f7a3f" : "#842029" }]}>{isRented ? t("propertyDetail.rented") : availability ? t("propertyDetail.available") : t("propertyDetail.unavailable")}</Text>
            </View>
            {typeof views !== "undefined" && (
              <Text style={styles.viewText}>{t("propertyDetail.viewsCount", { count: views })}</Text>
            )}
          </View>
        </View>

        <Text style={[styles.title, { color: colors.text }]}>{property.title || property.name || t("propertyDetail.titleFallback")}</Text>
        <Text style={[styles.locationText, { color: colors.textSecondary }]}>{location}</Text>

        <View style={[styles.section, { backgroundColor: colors.surface }]}> 
          <Text style={[styles.sectionHeader, { color: colors.text }]}>{t("propertyDetail.description")}</Text>
          {isPremiumLocked ? (
            <View style={[styles.lockedBox, { backgroundColor: colors.muted || "#f3f4f6" }]}>
              <Icon name="lock" size={32} color={colors.primary} />
              <Text style={[styles.lockedTitle, { color: colors.text }]}>{t("propertyDetail.premiumLocked")}</Text>
              <Text style={[styles.lockedMessage, { color: colors.textSecondary }]}>
                {t("propertyDetail.premiumLockedMessage")}
              </Text>
              <TouchableOpacity style={[styles.upgradeButton, { backgroundColor: colors.primary }]} onPress={handleUpgrade}>
                <Text style={[styles.upgradeButtonText, { color: colors.surface }]}>{t("propertyDetail.upgradeToPremium")}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={expanded ? undefined : 4}>{description}</Text>
              {description.length > 140 && (
                <TouchableOpacity onPress={() => setExpanded(!expanded)}>
                  <Text style={[styles.readMoreText, { color: colors.primary }]}>{expanded ? t("propertyDetail.readLess") : t("propertyDetail.readMore")}</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {!isPremiumLocked && (
        <View style={[styles.section, { backgroundColor: colors.surface }]}> 
          <Text style={[styles.sectionHeader, { color: colors.text }]}>{t("propertyDetail.owner")}</Text>
          <View style={styles.ownerRow}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}> 
              <Text style={styles.avatarText}>{ownerName && ownerName !== '-' ? ownerName.charAt(0).toUpperCase() : '-'}</Text>
            </View>
            <View style={styles.ownerDetails}>
              <Text style={[styles.ownerName, { color: colors.text }]}>{ownerName}</Text>
                {role?.toLowerCase() !== "customer" && ownerEmail ? (
                  <Text style={[styles.ownerPhone, { color: colors.textSecondary }]}>{t("propertyDetail.email")}: {ownerEmail}</Text>
                ) : null}
            </View>
          </View>
        </View>
        )}

        {!isPremiumLocked && (
        <View style={[styles.section, { backgroundColor: colors.surface }]}> 
          <View style={styles.reviewsHeaderRow}>
            <Text style={[styles.sectionHeader, { color: colors.text }]}>{t("propertyDetail.reviews")}</Text>
            {reviewStats ? (
              <View style={styles.statsRow}>
                <Text style={[styles.avgText, { color: colors.text }]}>{Number(reviewStats.average || reviewStats.avg || 0).toFixed(1)}</Text>
                <View style={{ marginLeft: 8, flexDirection: "row", alignItems: "center" }}>{renderStars(Math.round(reviewStats.average || reviewStats.avg || 0))}</View>
                <Text style={[styles.countText, { color: colors.textSecondary }]}>{t("propertyDetail.reviewsCount", { count: reviewStats.count ?? reviewStats.total ?? reviews.length })}</Text>
              </View>
            ) : (
              <Text style={[styles.countText, { color: colors.textSecondary }]}>{t("propertyDetail.reviewsCount", { count: reviews.length })}</Text>
            )}
          </View>

          {reviews.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t("propertyDetail.noReviews")}</Text>
          ) : (
            reviews.map((review) => (
              <View key={review.id || review._id || `${review.user}-${Math.random()}`} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View style={[styles.avatar, { backgroundColor: colors.primary, marginRight: 8 }]}> 
                      <Text style={styles.avatarText}>{(review.user_name || review.author || review.user || "G").charAt(0).toUpperCase()}</Text>
                    </View>
                    <Text style={[styles.reviewName, { color: colors.text }]}>{review.user_name || review.author || review.user || t("propertyDetail.guest")}</Text>
                  </View>
                  <View style={styles.ratingRow}>{renderStars(review.rating)}</View>
                </View>
                <Text style={[styles.reviewComment, { color: colors.textSecondary }]}>{review.comment || review.body || t("propertyDetail.noComment")}</Text>
                <Text style={[styles.reviewDate, { color: colors.textSecondary }]}>{new Date(review.created_at || review.date || review.timestamp || review.created).toLocaleDateString()}</Text>
              </View>
            ))
          )}
        </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}> 
        {isPremiumLocked ? (
          <TouchableOpacity
            style={[styles.bookButton, { backgroundColor: colors.primary }]}
            onPress={handleUpgrade}
          >
            <Text style={[styles.bookButtonText, { color: colors.surface }]}>{t("propertyDetail.upgradeToPremium")}</Text>
          </TouchableOpacity>
        ) : (
        <TouchableOpacity
          style={[
            styles.bookButton,
            (!canBook || !availability || isRented) && styles.disabledButton,
            { backgroundColor: canBook && !isRented ? colors.primary : colors.border },
          ]}
          disabled={!canBook || !availability || isRented}
          onPress={handleBookNow}
        >
          <Text style={[styles.bookButtonText, { color: colors.surface }]}>{isRented ? t("propertyDetail.rented") : t("propertyDetail.bookNow")}</Text>
        </TouchableOpacity>
        )}
        {isLandlord && (
          <Text style={[styles.disabledNotice, { color: colors.textSecondary }]}>{t("propertyDetail.landlordNotice")}</Text>
        )}
        {isRented && !isLandlord && (
          <Text style={[styles.disabledNotice, { color: colors.textSecondary }]}>{t("propertyDetail.alreadyRented")}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gallery: {
    maxHeight: 320,
  },
  heroImage: {
    width,
    height: 320,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  metaLeft: {
    flex: 1,
  },
  metaRight: {
    alignItems: "flex-end",
  },
  categoryText: {
    alignSelf: "flex-start",
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 10,
    overflow: "hidden",
  },
  priceText: {
    fontSize: 22,
    fontWeight: "900",
  },
  statusPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  viewText: {
    fontSize: 12,
    color: "#777",
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 8,
  },
  locationText: {
    fontSize: 16,
    marginBottom: 18,
  },
  section: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 10,
  },
  readMoreText: {
    fontWeight: "700",
  },
  lockedBox: {
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },
  lockedTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginTop: 12,
    marginBottom: 8,
    textAlign: "center",
  },
  lockedMessage: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 16,
  },
  upgradeButton: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  upgradeButtonText: {
    fontSize: 15,
    fontWeight: "800",
  },
  ownerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  avatarText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
  },
  ownerDetails: {
    flex: 1,
  },
  ownerName: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4,
  },
  ownerPhone: {
    fontSize: 14,
  },
  reviewCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    backgroundColor: "#f9f9f9",
  },
  reviewsHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  statsRow: { flexDirection: "row", alignItems: "center" },
  avgText: { fontSize: 20, fontWeight: "800" },
  countText: { fontSize: 13, marginLeft: 8 },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  reviewName: {
    fontSize: 15,
    fontWeight: "700",
  },
  ratingRow: {
    flexDirection: "row",
  },
  starIcon: {
    marginRight: 4,
  },
  reviewComment: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  reviewDate: {
    fontSize: 12,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: Platform.OS === "ios" ? 90 : 80,
    borderTopWidth: 1,
    padding: 16,
    zIndex: 20,
  },
  bookButton: {
    width: "100%",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: {
    opacity: 0.6,
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: "800",
  },
  disabledNotice: {
    marginTop: 10,
    fontSize: 13,
    textAlign: "center",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 16,
  },
  bottomSpacer: {
    height: 110,
  },
});