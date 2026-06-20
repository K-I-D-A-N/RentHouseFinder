import api from "./axiosConfig";

export const getListingReviews = (listingId, params) => api.get(`/reviews/listing/${listingId}/`, { params });
export const getListingReviewStats = (listingId) => api.get(`/reviews/listing/${listingId}/stats/`);
export const createReview = (data) => api.post("/reviews/", data);
export const deleteReview = (reviewId) => api.delete(`/reviews/${reviewId}/`);
