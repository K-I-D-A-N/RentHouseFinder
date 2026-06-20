import { makeAutoObservable } from "mobx";

class SubscriptionStore {
  plan = null;
  account_status = null;
  tx_ref = null;
  limits = {
    posts: 0,
    approvals: 0,
  };

  constructor() {
    makeAutoObservable(this);
  }

  setPlan(plan) {
    this.plan = plan;
  }

  setAccountStatus(status) {
    this.account_status = status;
  }

  setTxRef(txRef) {
    this.tx_ref = txRef;
  }

  setLimits(limits) {
    this.limits = { ...this.limits, ...limits };
  }

  reset() {
    this.plan = null;
    this.account_status = null;
    this.tx_ref = null;
    this.limits = { posts: 0, approvals: 0 };
  }
}

export default new SubscriptionStore();
