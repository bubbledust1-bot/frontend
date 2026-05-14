/**
 * 认证 API 封装。
 */

import { request } from "./http.js";

/**
 * 登录。
 * @param {string} username - 用户名
 * @param {string} password - 密码
 * @returns {Promise<{access_token: string, refresh_token: string, token_type: string}>}
 */
export async function login(username, password) {
  return request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

/**
 * 刷新 token。
 * @param {string} refreshToken - Refresh token
 * @returns {Promise<{access_token: string, token_type: string}>}
 */
export async function refreshToken(refreshToken) {
  return request("/api/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
}

/**
 * 获取当前用户信息。
 * @returns {Promise<{id: number, username: string, email?: string, nickname?: string, role: string, is_active: boolean, must_change_password: boolean, last_login_at?: string}>}
 */
export async function getMe() {
  return request("/api/auth/me");
}

/**
 * 更新当前用户个人资料。
 * @param {object} data - 更新数据
 * @param {string} [data.nickname] - 昵称
 * @param {string} [data.email] - 邮箱
 * @returns {Promise<object>}
 */
export async function updateProfile(data) {
  return request("/api/auth/me", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

/**
 * 修改当前用户密码。
 * @param {string} currentPassword - 当前密码
 * @param {string} newPassword - 新密码
 * @returns {Promise<void>}
 */
export async function changePassword(currentPassword, newPassword) {
  return request("/api/auth/me/change-password", {
    method: "POST",
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
}
