export const isPremiumCustomer = (user) => user?.is_premium_customer === true;

export const isPremiumListing = (listing) =>
  listing?.is_premium_post === true || listing?.requires_premium === true;

export const filterListingsForCustomer = (listings, user) => {
  if (isPremiumCustomer(user)) return listings || [];
  return (listings || []).filter((item) => !isPremiumListing(item));
};

export const mapLandlordUsage = (data) => {
  if (!data) return null;
  return {
    postsUsed: data.posts_used ?? data.postsUsed ?? 0,
    remainingPosts: data.remaining_posts ?? data.posts_remaining ?? data.remainingPosts ?? 0,
    premiumPostsUsed: data.premium_posts_used ?? data.premiumPostsUsed ?? 0,
    remainingPremiumPosts:
      data.remaining_premium_posts ?? data.premium_posts_remaining ?? data.remainingPremiumPosts ?? 0,
    approvalsUsed: data.approvals_used ?? data.approvalsUsed ?? 0,
    remainingApprovals:
      data.remaining_approvals ?? data.approvals_remaining ?? data.remainingApprovals ?? 0,
  };
};
