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
  // 1. Hardcode initial state to true
  token: "dummy-token",
  username: "demo-user",
  isAuthenticated: true,

  // 2. Force authentication on page reload
  hydrate: () => {
    set({ token: "dummy-token", username: "demo-user", isAuthenticated: true });
  },

  // 3. Remove API calls and mock a successful login
  login: async (email, password) => {
    const token = "dummy-token";
    const username = email.split("@")[0];
    
    tokenStorage.set(token);
    localStorage.setItem(USERNAME_KEY, username);
    set({ token, username, isAuthenticated: true });
  },

  // 4. Remove API calls and mock a successful signup
  signup: async (username, email, password) => {
    const token = "dummy-token";
    
    tokenStorage.set(token);
    localStorage.setItem(USERNAME_KEY, username);
    set({ token, username, isAuthenticated: true });
  },

  logout: () => {
    tokenStorage.clear();
    localStorage.removeItem(USERNAME_KEY);
    set({ token: null, username: null, isAuthenticated: false });
  },
}));
