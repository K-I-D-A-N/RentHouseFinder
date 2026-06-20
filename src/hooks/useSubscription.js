import { useEffect, useMemo, useState } from "react";
import { fetchPlans, upgradePlan, initiateCustomerPremiumUpgrade } from "../services/subscriptionService";

export default function useSubscription() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const planList = await fetchPlans();
      setPlans(planList);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const choosePlan = async (planId, extraPayload = {}) => {
    try {
      setLoading(true);
      setError(null);
      const data = await upgradePlan({ plan_id: planId, ...extraPayload });
      return data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const upgradeCustomerPremium = async (payload = {}) => {
    try {
      setLoading(true);
      setError(null);
      const data = await initiateCustomerPremiumUpgrade(payload);
      return data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  return useMemo(
    () => ({
      plans,
      loading,
      error,
      loadPlans,
      choosePlan,
      upgradeCustomerPremium,
    }),
    [plans, loading, error]
  );
}
