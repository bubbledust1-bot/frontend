/**
 * 账户管理 API 封装（仅 superadmin）。
 */

import { request } from "./http.js";

/**
 * 获取所有用户列表。
 * @returns {Promise<Array<{id: number, username: string, email?: string, nickname?: string, role: string, is_active: boolean, must_change_password: boolean, created_at: string, last_login_at?: string}>>}
 */
export async function listUsers() {
  return request("/api/admin/users");
}

/**
 * 创建新用户。
 * @param {object} data - 用户数据
 * @param {string} data.username - 用户名
 * @param {string} data.password - 密码
 * @param {string} [data.email] - 邮箱
 * @param {string} [data.nickname] - 昵称
 * @param {string} [data.role] - 角色
 * @param {boolean} [data.must_change_password] - 是否需要强制修改密码
 * @returns {Promise<object>}
 */
export async function createUser(data) {
  return request("/api/admin/users", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * 更新用户信息。
 * @param {number} userId - 用户 ID
 * @param {object} data - 更新数据
 * @param {string} [data.email] - 邮箱
 * @param {string} [data.nickname] - 昵称
 * @param {string} [data.role] - 角色
 * @returns {Promise<object>}
 */
export async function updateUser(userId, data) {
  return request(`/api/admin/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

/**
 * 重置用户密码。
 * @param {number} userId - 用户 ID
 * @param {string} newPassword - 新密码
 * @returns {Promise<object>}
 */
export async function resetUserPassword(userId, newPassword) {
  return request(`/api/admin/users/${userId}/reset-password`, {
    method: "POST",
    body: JSON.stringify({ new_password: newPassword }),
  });
}

/**
 * 启用/禁用用户。
 * @param {number} userId - 用户 ID
 * @returns {Promise<object>}
 */
export async function toggleUserActive(userId) {
  return request(`/api/admin/users/${userId}/toggle-active`, {
    method: "POST",
  });
}

/**
 * 删除用户。
 * @param {number} userId - 用户 ID
 * @returns {Promise<void>}
 */
export async function deleteUser(userId) {
  return request(`/api/admin/users/${userId}`, {
    method: "DELETE",
  });
}
