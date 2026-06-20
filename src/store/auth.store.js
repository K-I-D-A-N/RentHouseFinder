import { makeAutoObservable } from "mobx";

class AuthStore {
  user = null;
  token = null;
  loading = false;

  constructor() {
    makeAutoObservable(this);
  }

  setUser(user) {
    this.user = user;
  }

  setToken(token) {
    this.token = token;
  }

  setLoading(value) {
    this.loading = value;
  }

  reset() {
    this.user = null;
    this.token = null;
    this.loading = false;
  }
}

export default new AuthStore();
