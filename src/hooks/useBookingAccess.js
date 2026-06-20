import { useMemo } from "react";
import { useAuth } from "./useAuth";

export default function useBookingAccess() {
  const { user } = useAuth();

  return useMemo(() => {
    if (!user) return { canBook: false, canManageBookings: false };

    const isLandlord = user.role === "landlord" || user.is_landlord;
    const canBook = user.role === "tenant" || user.is_tenant;

    return {
      canBook,
      canManageBookings: isLandlord,
    };
  }, [user]);
}
