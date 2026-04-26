import { create } from "zustand";
import { api, tokenStorage } from "@/lib/api";

interface AuthState {
  token: string | null;
  username: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    username: string,
    email: string,
    password: string,
  ) => Promise<void>;
  logout: () => void;
  hydrate: () => void;
}

const USERNAME_KEY = "compilerhub:username";

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  username: null,
  isAuthenticated: false,

  hydrate: () => {
    const token = tokenStorage.get();
    const username = localStorage.getItem(USERNAME_KEY);
    set({ token, username, isAuthenticated: !!token });
  },

  login: async (email, password) => {
    const { data } = await api.post("/api/auth/login", { email, password });
    const token = data.token ?? data.access_token;
    const username = data.username ?? email.split("@")[0];
    if (!token) throw new Error("No token returned from server");
    tokenStorage.set(token);
    localStorage.setItem(USERNAME_KEY, username);
    set({ token, username, isAuthenticated: true });
  },

  signup: async (username, email, password) => {
    const { data } = await api.post("/api/auth/signup", {
      username,
      email,
      password,
    });
    const token = data.token ?? data.access_token;
    const finalUsername = data.username ?? username;
    if (!token) throw new Error("No token returned from server");
    tokenStorage.set(token);
    localStorage.setItem(USERNAME_KEY, finalUsername);
    set({ token, username: finalUsername, isAuthenticated: true });
  },

  logout: () => {
    tokenStorage.clear();
    localStorage.removeItem(USERNAME_KEY);
    set({ token: null, username: null, isAuthenticated: false });
  },
}));
