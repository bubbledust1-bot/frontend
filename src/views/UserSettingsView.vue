<script setup>
import { ref, reactive } from "vue";
import { useRouter } from "vue-router";
import { currentUser, logout, fetchUser, mustChangePassword } from "../stores/authStore.js";
import * as authApi from "../api/auth.js";

const router = useRouter();

const profileForm = reactive({
  nickname: currentUser.value?.nickname || "",
  email: currentUser.value?.email || "",
});

const passwordForm = reactive({
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
});

const loading = ref(false);
const error = ref("");
const success = ref("");
const showPasswordSection = ref(false);

async function updateProfile() {
  error.value = "";
  success.value = "";
  loading.value = true;
  try {
    await authApi.updateProfile({
      nickname: profileForm.nickname || null,
      email: profileForm.email || null,
    });
    await fetchUser();
    success.value = "个人资料更新成功";
  } catch (e) {
    error.value = e?.message || "更新失败";
  } finally {
    loading.value = false;
  }
}

async function changePassword() {
  error.value = "";
  success.value = "";
  if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
    error.value = "请填写所有密码字段";
    return;
  }
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    error.value = "两次输入的新密码不一致";
    return;
  }
  if (passwordForm.newPassword.length < 6) {
    error.value = "新密码长度至少为 6 位";
    return;
  }
  loading.value = true;
  try {
    await authApi.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
    await fetchUser();
    passwordForm.currentPassword = "";
    passwordForm.newPassword = "";
    passwordForm.confirmPassword = "";
    success.value = "密码修改成功";
    if (mustChangePassword.value) {
      router.push("/overview");
    }
  } catch (e) {
    error.value = e?.message || "修改密码失败";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="user-settings-page platform-page">
    <h1>用户设置</h1>

    <div v-if="mustChangePassword" class="must-change-warning">
      <p>⚠️ 您需要先修改密码才能继续使用平台</p>
    </div>

    <div class="settings-section">
      <h2>基本信息</h2>
      <div class="form-group">
        <label>用户名</label>
        <input type="text" :value="currentUser?.username" disabled />
      </div>
      <div class="form-group">
        <label>昵称</label>
        <input type="text" v-model="profileForm.nickname" placeholder="请输入昵称" />
      </div>
      <div class="form-group">
        <label>邮箱</label>
        <input type="email" v-model="profileForm.email" placeholder="请输入邮箱（可选）" />
      </div>
      <div class="form-group">
        <label>角色</label>
        <input type="text" :value="currentUser?.role" disabled />
      </div>
      <div class="form-group">
        <label>最后登录</label>
        <input
          type="text"
          :value="currentUser?.last_login_at ? new Date(currentUser.last_login_at).toLocaleString() : '—'"
          disabled
        />
      </div>
      <div class="form-actions">
        <button type="button" class="btn primary" @click="updateProfile" :disabled="loading">
          {{ loading ? '保存中...' : '保存修改' }}
        </button>
      </div>
    </div>

    <div class="settings-section">
      <h2>修改密码</h2>
      <div class="form-group">
        <label>当前密码</label>
        <input type="password" v-model="passwordForm.currentPassword" placeholder="请输入当前密码" />
      </div>
      <div class="form-group">
        <label>新密码</label>
        <input type="password" v-model="passwordForm.newPassword" placeholder="请输入新密码（至少 6 位）" />
      </div>
      <div class="form-group">
        <label>确认新密码</label>
        <input type="password" v-model="passwordForm.confirmPassword" placeholder="请再次输入新密码" />
      </div>
      <div class="form-actions">
        <button type="button" class="btn primary" @click="changePassword" :disabled="loading">
          {{ loading ? '修改中...' : '修改密码' }}
        </button>
      </div>
    </div>

    <p v-if="error" class="error-msg">{{ error }}</p>
    <p v-if="success" class="success-msg">{{ success }}</p>
  </div>
</template>

<style scoped>
.user-settings-page {
  max-width: 600px;
}

.user-settings-page h1 {
  margin-top: 0;
  color: #1b5e20;
  font-size: 1.5rem;
}

.must-change-warning {
  background: #fff3e0;
  border: 1px solid #ffb74d;
  border-radius: 10px;
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.must-change-warning p {
  margin: 0;
  color: #e65100;
  font-weight: 600;
}

.settings-section {
  background: #ffffff;
  border: 1px solid #c8e6c9;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1rem;
}

.settings-section h2 {
  margin: 0 0 1rem;
  color: #2e7d32;
  font-size: 1.1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-bottom: 1rem;
}

.form-group label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #455a47;
}

.form-group input {
  padding: 0.55rem 0.7rem;
  border: 1px solid #a5d6a7;
  border-radius: 10px;
  font-size: 0.95rem;
  background: #f8fdf8;
}

.form-group input:disabled {
  background: #f0f0f0;
  color: #7a8f7d;
  cursor: not-allowed;
}

.form-group input:focus {
  outline: none;
  border-color: #43a047;
  box-shadow: 0 0 0 3px rgba(67, 160, 71, 0.15);
}

.form-actions {
  margin-top: 0.5rem;
}

.btn {
  padding: 0.55rem 1rem;
  border: 1px solid #66bb6a;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
}

.btn.primary {
  background: linear-gradient(180deg, #e8f5e9, #c8e6c9);
  color: #1b5e20;
}

.btn:hover:not(:disabled) {
  filter: brightness(1.02);
}

.btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.error-msg {
  margin-top: 1rem;
  color: #c62828;
  font-weight: 500;
}

.success-msg {
  margin-top: 1rem;
  color: #2e7d32;
  font-weight: 500;
}
</style>
