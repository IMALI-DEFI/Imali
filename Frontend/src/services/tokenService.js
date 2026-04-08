// src/services/tokenService.js
// STANDALONE - no imports from other project files
const TOKEN_KEY = "imali_token";
const USER_KEY = "imali_user";

export const tokenService = {
  getToken: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  
  setToken: (token) => {
    try {
      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
    } catch (e) {
      console.warn(e);
    }
  },
  
  clearToken: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch (e) {
      console.warn(e);
    }
  },
  
  getUser: () => {
    try {
      const user = localStorage.getItem(USER_KEY);
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  },
  
  setUser: (user) => {
    try {
      if (user) {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(USER_KEY);
      }
    } catch (e) {
      console.warn(e);
    }
  },
  
  clearUser: () => {
    try {
      localStorage.removeItem(USER_KEY);
    } catch (e) {
      console.warn(e);
    }
  },
  
  clearAll: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch (e) {
      console.warn(e);
    }
  }
};
