<script setup>
import { ref, reactive, onMounted } from "vue";
import * as adminApi from "../api/admin.js";
import {
  registrationRequests,
  removeRequest,
  loadRequestsFromStorage,
} from "../stores/registrationStore.js";

const users = ref([]);
const loading = ref(false);
const error = ref("");
const requests = registrationRequests;

const showCreateModal = ref(false);
const showEditModal = ref(false);
const showResetModal = ref(false);
const showDeleteConfirm = ref(false);

const selectedUser = ref(null);

const createForm = reactive({
  username: "",
  password: "",
  email: "",
  nickname: "",
  role: "user",
  mustChangePassword: true,
});

const editForm = reactive({
  email: "",
  nickname: "",
  role: "user",
});

const resetForm = reactive({
  newPassword: "",
  confirmPassword: "",
});

onMounted(() => {
  loadRequestsFromStorage();
  loadUsers();
});

async function loadUsers() {
  loading.value = true;
  error.value = "";
  try {
    users.value = await adminApi.listUsers();
  } catch (e) {
    error.value = e?.message || "加载用户列表失败";
  } finally {
    loading.value = false;
  }
}

async function approveRequest(request) {
  error.value = "";
  
  // 验证用户名和密码长度
  if (request.username.length < 3) {
    error.value = `用户 ${request.username} 的用户名太短，至少需要 3 个字符`;
    return;
  }
  if (request.password.length < 6) {
    error.value = `用户 ${request.username} 的密码太短，至少需要 6 个字符`;
    return;
  }
  
  loading.value = true;
  try {
    // 同意申请，创建用户
    await adminApi.createUser({
      username: request.username,
      password: request.password,
      email: null,
      nickname: request.username,
      role: "user",
      must_change_password: true
    });
    
    // 移除申请
    removeRequest(request.id);
    await loadUsers();
    alert(`用户 ${request.username} 已创建成功！`);
  } catch (e) {
    error.value = e?.message || "同意申请失败";
  } finally {
    loading.value = false;
  }
}

function deleteRequest(request) {
  if (confirm(`确定要删除用户 ${request.username} 的申请吗？`)) {
    removeRequest(request.id);
  }
}

async function createUser() {
  if (!createForm.username || !createForm.password) {
    error.value = "请填写用户名和密码";
    return;
  }
  if (createForm.password.length < 6) {
    error.value = "密码长度至少为 6 位";
    return;
  }
  loading.value = true;
  try {
    await adminApi.createUser({
      username: createForm.username,
      password: createForm.password,
      email: createForm.email || null,
      nickname: createForm.nickname || null,
      role: createForm.role,
      must_change_password: createForm.mustChangePassword,
    });
    await loadUsers();
    closeCreateModal();
  } catch (e) {
    error.value = e?.message || "创建用户失败";
  } finally {
    loading.value = false;
  }
}

async function updateUser() {
  loading.value = true;
  try {
    await adminApi.updateUser(selectedUser.value.id, {
      email: editForm.email || null,
      nickname: editForm.nickname || null,
      role: editForm.role,
    });
    await loadUsers();
    closeEditModal();
  } catch (e) {
    error.value = e?.message || "更新用户失败";
  } finally {
    loading.value = false;
  }
}

async function resetUserPassword() {
  if (!resetForm.newPassword || !resetForm.confirmPassword) {
    error.value = "请填写所有密码字段";
    return;
  }
  if (resetForm.newPassword !== resetForm.confirmPassword) {
    error.value = "两次输入的密码不一致";
    return;
  }
  if (resetForm.newPassword.length < 6) {
    error.value = "密码长度至少为 6 位";
    return;
  }
  loading.value = true;
  try {
    await adminApi.resetUserPassword(selectedUser.value.id, resetForm.newPassword);
    await loadUsers();
    closeResetModal();
  } catch (e) {
    error.value = e?.message || "重置密码失败";
  } finally {
    loading.value = false;
  }
}

async function toggleUserActive(user) {
  loading.value = true;
  try {
    await adminApi.toggleUserActive(user.id);
    await loadUsers();
  } catch (e) {
    error.value = e?.message || "操作失败";
  } finally {
    loading.value = false;
  }
}

async function deleteUser() {
  loading.value = true;
  try {
    await adminApi.deleteUser(selectedUser.value.id);
    await loadUsers();
    closeDeleteConfirm();
  } catch (e) {
    error.value = e?.message || "删除用户失败";
  } finally {
    loading.value = false;
  }
}

function openCreateModal() {
  error.value = "";
  createForm.username = "";
  createForm.password = "";
  createForm.email = "";
  createForm.nickname = "";
  createForm.role = "user";
  createForm.mustChangePassword = true;
  showCreateModal.value = true;
}

function closeCreateModal() {
  showCreateModal.value = false;
}

function openEditModal(user) {
  error.value = "";
  selectedUser.value = user;
  editForm.email = user.email || "";
  editForm.nickname = user.nickname || "";
  editForm.role = user.role;
  showEditModal.value = true;
}

function closeEditModal() {
  showEditModal.value = false;
  selectedUser.value = null;
}

function openResetModal(user) {
  error.value = "";
  selectedUser.value = user;
  resetForm.newPassword = "";
  resetForm.confirmPassword = "";
  showResetModal.value = true;
}

function closeResetModal() {
  showResetModal.value = false;
  selectedUser.value = null;
}

function openDeleteConfirm(user) {
  error.value = "";
  selectedUser.value = user;
  showDeleteConfirm.value = true;
}

function closeDeleteConfirm() {
  showDeleteConfirm.value = false;
  selectedUser.value = null;
}

function getRoleLabel(role) {
  const labels = {
    superadmin: "超级管理员",
    admin: "管理员",
    user: "普通用户",
  };
  return labels[role] || role;
}
</script>

<template>
  <div class="account-management-page platform-page">
    <div class="page-header">
      <h1>账户管理</h1>
      <button type="button" class="btn primary" @click="openCreateModal" :disabled="loading">
        + 新建账户
      </button>
    </div>

    <p v-if="error" class="error-msg">{{ error }}</p>

    <div v-if="loading && !users.length" class="loading-placeholder">
      加载中...
    </div>

    <div v-else class="users-table-container">
      <table class="users-table">
        <thead>
          <tr>
            <th>用户名</th>
            <th>昵称</th>
            <th>角色</th>
            <th>状态</th>
            <th>创建时间</th>
            <th>最后登录</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id">
            <td>{{ user.username }}</td>
            <td>{{ user.nickname || '—' }}</td>
            <td>
              <span class="role-tag" :class="user.role">
                {{ getRoleLabel(user.role) }}
              </span>
            </td>
            <td>
              <span class="status-tag" :class="user.is_active ? 'active' : 'inactive'">
                {{ user.is_active ? '启用' : '禁用' }}
              </span>
            </td>
            <td>{{ new Date(user.created_at).toLocaleString() }}</td>
            <td>{{ user.last_login_at ? new Date(user.last_login_at).toLocaleString() : '—' }}</td>
            <td>
              <div class="actions">
                <button type="button" class="btn ghost small" @click="openEditModal(user)" :disabled="loading">
                  编辑
                </button>
                <button type="button" class="btn ghost small" @click="openResetModal(user)" :disabled="loading">
                  重置密码
                </button>
                <button
                  type="button"
                  class="btn ghost small"
                  @click="toggleUserActive(user)"
                  :disabled="loading"
                >
                  {{ user.is_active ? '禁用' : '启用' }}
                </button>
                <button type="button" class="btn danger small" @click="openDeleteConfirm(user)" :disabled="loading">
                  删除
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 账户申请表格 -->
    <div v-if="requests.length > 0" class="requests-section">
      <h2>账户申请</h2>
      <div class="users-table-container">
        <table class="users-table">
          <thead>
            <tr>
              <th>用户名</th>
              <th>申请时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="request in requests" :key="request.id">
              <td>{{ request.username }}</td>
              <td>{{ new Date(request.created_at).toLocaleString() }}</td>
              <td>
              <div class="actions">
                <button type="button" class="btn primary small" @click="approveRequest(request)" :disabled="loading">
                  {{ loading ? '处理中...' : '同意' }}
                </button>
                <button type="button" class="btn danger small" @click="deleteRequest(request)" :disabled="loading">
                  删除
                </button>
              </div>
            </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 创建用户模态框 -->
    <div v-if="showCreateModal" class="modal-backdrop" @click.self="closeCreateModal">
      <div class="modal">
        <h2>新建账户</h2>
        <div class="modal-form">
          <label>
            用户名 <span class="required">*</span>
            <input type="text" v-model="createForm.username" placeholder="请输入用户名" />
          </label>
          <label>
            密码 <span class="required">*</span>
            <input type="password" v-model="createForm.password" placeholder="请输入密码（至少 6 位）" />
          </label>
          <label>
            昵称
            <input type="text" v-model="createForm.nickname" placeholder="请输入昵称（可选）" />
          </label>
          <label>
            邮箱
            <input type="email" v-model="createForm.email" placeholder="请输入邮箱（可选）" />
          </label>
          <label>
            角色
            <select v-model="createForm.role">
              <option value="user">普通用户</option>
              <option value="admin">管理员</option>
              <option value="superadmin">超级管理员</option>
            </select>
          </label>
          <label class="checkbox-label">
            <input type="checkbox" v-model="createForm.mustChangePassword" />
            首次登录强制修改密码
          </label>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn ghost" @click="closeCreateModal" :disabled="loading">
            取消
          </button>
          <button type="button" class="btn primary" @click="createUser" :disabled="loading">
            {{ loading ? '创建中...' : '创建' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 编辑用户模态框 -->
    <div v-if="showEditModal" class="modal-backdrop" @click.self="closeEditModal">
      <div class="modal">
        <h2>编辑账户</h2>
        <div class="modal-form">
          <label>
            用户名
            <input type="text" :value="selectedUser?.username" disabled />
          </label>
          <label>
            昵称
            <input type="text" v-model="editForm.nickname" placeholder="请输入昵称（可选）" />
          </label>
          <label>
            邮箱
            <input type="email" v-model="editForm.email" placeholder="请输入邮箱（可选）" />
          </label>
          <label>
            角色
            <select v-model="editForm.role">
              <option value="user">普通用户</option>
              <option value="admin">管理员</option>
              <option value="superadmin">超级管理员</option>
            </select>
          </label>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn ghost" @click="closeEditModal" :disabled="loading">
            取消
          </button>
          <button type="button" class="btn primary" @click="updateUser" :disabled="loading">
            {{ loading ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 重置密码模态框 -->
    <div v-if="showResetModal" class="modal-backdrop" @click.self="closeResetModal">
      <div class="modal">
        <h2>重置密码</h2>
        <p class="reset-hint">
          正在重置用户 <strong>{{ selectedUser?.username }}</strong> 的密码。
          重置后用户需要强制修改密码。
        </p>
        <div class="modal-form">
          <label>
            新密码 <span class="required">*</span>
            <input type="password" v-model="resetForm.newPassword" placeholder="请输入新密码（至少 6 位）" />
          </label>
          <label>
            确认新密码 <span class="required">*</span>
            <input type="password" v-model="resetForm.confirmPassword" placeholder="请再次输入新密码" />
          </label>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn ghost" @click="closeResetModal" :disabled="loading">
            取消
          </button>
          <button type="button" class="btn primary" @click="resetUserPassword" :disabled="loading">
            {{ loading ? '重置中...' : '重置密码' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 删除确认模态框 -->
    <div v-if="showDeleteConfirm" class="modal-backdrop" @click.self="closeDeleteConfirm">
      <div class="modal danger">
        <h2>确认删除</h2>
        <p>确定要删除用户 <strong>{{ selectedUser?.username }}</strong> 吗？此操作不可恢复。</p>
        <div class="modal-actions">
          <button type="button" class="btn ghost" @click="closeDeleteConfirm" :disabled="loading">
            取消
          </button>
          <button type="button" class="btn danger" @click="deleteUser" :disabled="loading">
            {{ loading ? '删除中...' : '确认删除' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.account-management-page {
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.page-header h1 {
  margin: 0;
  color: #1b5e20;
  font-size: 1.5rem;
}

.requests-section {
  margin-top: 2rem;
}

.requests-section h2 {
  margin: 0 0 1rem;
  color: #1b5e20;
  font-size: 1.2rem;
}

.error-msg {
  margin-bottom: 1rem;
  color: #c62828;
  font-weight: 500;
}

.loading-placeholder {
  text-align: center;
  padding: 2rem;
  color: #7a8f7d;
}

.users-table-container {
  background: #ffffff;
  border: 1px solid #c8e6c9;
  border-radius: 12px;
  overflow: hidden;
}

.users-table {
  width: 100%;
  border-collapse: collapse;
}

.users-table th,
.users-table td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid #e8f5e9;
}

.users-table th {
  background: #f8fdf8;
  font-weight: 700;
  color: #2e5233;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.users-table td {
  font-size: 0.9rem;
  color: #314338;
}

.role-tag {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.role-tag.superadmin {
  background: #e8f5e9;
  color: #1b5e20;
}

.role-tag.admin {
  background: #fff3e0;
  color: #e65100;
}

.role-tag.user {
  background: #e3f2fd;
  color: #0d47a1;
}

.status-tag {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.status-tag.active {
  background: #e8f5e9;
  color: #2e7d32;
}

.status-tag.inactive {
  background: #ffebee;
  color: #c62828;
}

.actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.btn {
  padding: 0.4rem 0.75rem;
  border: 1px solid #66bb6a;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 0.15s ease;
}

.btn.primary {
  background: linear-gradient(180deg, #e8f5e9, #c8e6c9);
  color: #1b5e20;
}

.btn.ghost {
  background: #ffffff;
  color: #34533a;
  border-color: #cfd8ce;
}

.btn.danger {
  background: #ffebee;
  color: #c62828;
  border-color: #ef9a9a;
}

.btn.small {
  padding: 0.25rem 0.5rem;
  font-size: 0.78rem;
}

.btn:hover:not(:disabled) {
  filter: brightness(1.02);
}

.btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 1rem;
}

.modal {
  width: 100%;
  max-width: 480px;
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid #c8e6c9;
  background: #fff;
  box-shadow: 0 8px 32px rgba(27, 94, 32, 0.12);
}

.modal.danger {
  border-color: #ef9a9a;
}

.modal h2 {
  margin: 0 0 1rem;
  font-size: 1.1rem;
  color: #1b5e20;
}

.modal.danger h2 {
  color: #c62828;
}

.reset-hint {
  margin: 0 0 1rem;
  color: #455a47;
  font-size: 0.9rem;
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  margin-bottom: 1rem;
}

.modal-form label {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.85rem;
  color: #455a47;
}

.modal-form input,
.modal-form select {
  padding: 0.5rem 0.65rem;
  border: 1px solid #a5d6a7;
  border-radius: 8px;
  font-size: 0.95rem;
  background: #f8fdf8;
}

.modal-form input:disabled {
  background: #f0f0f0;
  color: #7a8f7d;
  cursor: not-allowed;
}

.modal-form input:focus,
.modal-form select:focus {
  outline: none;
  border-color: #43a047;
  box-shadow: 0 0 0 3px rgba(67, 160, 71, 0.15);
}

.modal-form .checkbox-label {
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
}

.required {
  color: #c62828;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
</style>
