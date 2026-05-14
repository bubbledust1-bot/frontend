/**
 * 认证状态管理（Vue 3 响应式）。
 */

import { reactive, computed } from "vue";
import * as authApi from "../api/auth.js";

// localStorage 键名
const ACCESS_TOKEN_KEY = "ds_access_token";
const REFRESH_TOKEN_KEY = "ds_refresh_token";

// 响应式状态
const state = reactive({
  accessToken: localStorage.getItem(ACCESS_TOKEN_KEY) || null,
  refreshToken: localStorage.getItem(REFRESH_TOKEN_KEY) || null,
  user: null,
  loading: false,
});

// 计算属性
export const isLoggedIn = computed(() => !!state.accessToken && !!state.user);
export const currentUser = computed(() => state.user);
export const isSuperadmin = computed(() => state.user?.role === "superadmin");
export const mustChangePassword = computed(() => state.user?.must_change_password === true);
export const authLoading = computed(() => state.loading);

/**
 * 保存 token 到 localStorage。
 */
function saveTokens(accessToken, refreshToken) {
  state.accessToken = accessToken;
  state.refreshToken = refreshToken;
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

/**
 * 清除认证状态。
 */
export function clearAuth() {
  state.accessToken = null;
  state.refreshToken = null;
  state.user = null;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

/**
 * 获取 access token。
 */
export function getAccessToken() {
  return state.accessToken;
}

/**
 * 获取 refresh token。
 */
export function getRefreshToken() {
  return state.refreshToken;
}

/**
 * 登录。
 */
export async function login(username, password) {
  state.loading = true;
  try {
    const tokens = await authApi.login(username, password);
    saveTokens(tokens.access_token, tokens.refresh_token);
    await fetchUser();
    return state.user;
  } finally {
    state.loading = false;
  }
}

/**
 * 获取当前用户信息。
 */
export async function fetchUser() {
  if (!state.accessToken) {
    return null;
  }
  state.loading = true;
  try {
    state.user = await authApi.getMe();
    return state.user;
  } catch (e) {
    clearAuth();
    throw e;
  } finally {
    state.loading = false;
  }
}

/**
 * 刷新 token。
 */
export async function refreshAccessToken() {
  if (!state.refreshToken) {
    clearAuth();
    throw new Error("无 refresh token");
  }
  try {
    const tokens = await authApi.refreshToken(state.refreshToken);
    state.accessToken = tokens.access_token;
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
    return tokens.access_token;
  } catch (e) {
    clearAuth();
    throw e;
  }
}

/**
 * 退出登录。
 */
export function logout() {
  clearAuth();
}

/**
 * 初始化认证状态（页面加载时调用）。
 */
export async function initAuth() {
  if (state.accessToken) {
    try {
      await fetchUser();
    } catch {
      // token 无效，已清除
    }
  }
}
