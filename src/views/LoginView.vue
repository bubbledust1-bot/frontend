<script setup>
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { login, isLoggedIn, authLoading } from "../stores/authStore.js";
import { addRequest } from "../stores/registrationStore.js";
import logoSrc from "../assets/logo1.png";

const router = useRouter();

const username = ref("");
const password = ref("");
const showPassword = ref(false);
const error = ref("");

async function handleLogin() {
  error.value = "";
  if (!username.value.trim() || !password.value) {
    error.value = "请输入用户名和密码";
    return;
  }
  try {
    await login(username.value.trim(), password.value);
    router.push("/overview");
  } catch (e) {
    error.value = e?.message || "登录失败，请检查用户名和密码";
  }
}

function handleRegister() {
  error.value = "";
  if (!username.value.trim() || !password.value) {
    error.value = "请输入用户名和密码";
    return;
  }
  if (username.value.trim().length < 3) {
    error.value = "用户名至少需要 3 个字符";
    return;
  }
  if (password.value.length < 6) {
    error.value = "密码至少需要 6 个字符";
    return;
  }
  addRequest(username.value.trim(), password.value);
  alert("已发送申请等待管理员审核");
  username.value = "";
  password.value = "";
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-brand">
        <img :src="logoSrc" alt="" class="login-logo" />
        <h1 class="login-title">DeepSight</h1>
        <h2 class="login-subtitle">SynCore</h2>
      </div>

      <form class="login-form" @submit.prevent="handleLogin">
        <div class="form-field">
          <label for="username">用户名</label>
          <input
            id="username"
            v-model="username"
            type="text"
            autocomplete="username"
            placeholder="请输入用户名"
          />
        </div>

        <div class="form-field">
          <label for="password">密码</label>
          <div class="password-input-wrapper">
            <input
              id="password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              placeholder="请输入密码"
            />
            <button
              type="button"
              class="toggle-password-btn"
              @click="showPassword = !showPassword"
              :title="showPassword ? '隐藏密码' : '显示密码'"
            >
              {{ showPassword ? "👁️" : "👁️‍🗨️" }}
            </button>
          </div>
        </div>

        <p v-if="error" class="error-msg">{{ error }}</p>

        <button type="submit" class="login-btn" :disabled="authLoading">
          {{ authLoading ? "登录中..." : "登录" }}
        </button>

        <button type="button" class="register-btn" @click="handleRegister">
          注册
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 50%, #a5d6a7 100%);
  padding: 1rem;
}

.login-card {
  width: 100%;
  max-width: 420px;
  background: #ffffff;
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 12px 48px rgba(27, 94, 32, 0.15);
  border: 1px solid #c8e6c9;
}

.login-brand {
  text-align: center;
  margin-bottom: 2rem;
}

.login-logo {
  width: 72px;
  height: 72px;
  object-fit: contain;
  margin-bottom: 1rem;
}

.login-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: #1b5e20;
  letter-spacing: -0.01em;
}

.login-subtitle {
  margin: 0.25rem 0 0;
  font-size: 1rem;
  font-weight: 600;
  color: #2e7d32;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-field label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #455a47;
}

.form-field input {
  padding: 0.6rem 0.75rem;
  border: 1px solid #a5d6a7;
  border-radius: 10px;
  font-size: 0.95rem;
  background: #f8fdf8;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.form-field input:focus {
  outline: none;
  border-color: #43a047;
  box-shadow: 0 0 0 3px rgba(67, 160, 71, 0.15);
}

.password-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.password-input-wrapper input {
  width: 100%;
  padding-right: 3rem;
}

.toggle-password-btn {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.25rem;
  line-height: 1;
}

.error-msg {
  margin: 0;
  color: #c62828;
  font-size: 0.85rem;
  font-weight: 500;
}

.login-btn {
  margin-top: 0.5rem;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 10px;
  background: linear-gradient(180deg, #4caf50, #388e3c);
  color: #ffffff;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.1s ease, box-shadow 0.1s ease;
  box-shadow: 0 2px 8px rgba(46, 125, 50, 0.2);
}

.login-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(46, 125, 50, 0.3);
}

.login-btn:active:not(:disabled) {
  transform: translateY(0);
}

.login-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.register-btn {
  margin-top: 0.5rem;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 10px;
  background: linear-gradient(180deg, #e8f5e9, #c8e6c9);
  color: #1b5e20;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.1s ease, box-shadow 0.1s ease;
  box-shadow: 0 2px 8px rgba(46, 125, 50, 0.1);
}

.register-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(46, 125, 50, 0.2);
}

.register-btn:active {
  transform: translateY(0);
}
</style>
