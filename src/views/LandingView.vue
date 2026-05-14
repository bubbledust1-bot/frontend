<script setup>
import { useRouter } from "vue-router";
import logoSrc from "../assets/logo1.png";

const router = useRouter();

function goToLogin() {
  router.push("/login");
}

function goToRegister() {
  router.push("/login?intent=register");
}
</script>

<template>
  <div class="landing-page">
    <!-- 背景装饰 -->
    <div class="bg-decor">
      <div class="glow glow-1"></div>
      <div class="glow glow-2"></div>
      <div class="glow glow-3"></div>
      <div class="grid-pattern"></div>
    </div>

    <!-- 顶部导航 -->
    <nav class="landing-nav">
      <div class="nav-left">
        <img :src="logoSrc" alt="" class="nav-logo" />
        <div class="nav-brand">
          <span class="brand-name">DeepSight</span>
          <span class="brand-sub">SynCore</span>
        </div>
      </div>
      <div class="nav-right">
        <button type="button" class="nav-btn nav-btn-login" @click="goToLogin">
          登录
        </button>
        <button type="button" class="nav-btn nav-btn-register" @click="goToRegister">
          注册
        </button>
      </div>
    </nav>

    <!-- 主体内容 -->
    <main class="landing-main">
      <div class="hero-content">
        <!-- 左侧内容 -->
        <div class="hero-left">
          <span class="hero-tag">Industrial AI Workspace</span>
          <h1 class="hero-title">
            让材料研发，从经验试错走向
            <span class="highlight">智能决策</span>
          </h1>
          <p class="hero-subtitle">
            DeepSight SynCore 面向工业材料研发场景，打通数据资产、模型训练、性能预测与实时监测，构建可演示、可迭代、可落地的智能闭环。
          </p>
          <div class="hero-buttons">
            <button type="button" class="cta-btn cta-btn-primary" @click="goToLogin">
              立即登录
            </button>
            <button type="button" class="cta-btn cta-btn-secondary" @click="goToRegister">
              申请注册
            </button>
          </div>
          <div class="feature-tags">
            <div class="feature-tag">
              <span class="tag-icon">📊</span>
              <span>数据资产</span>
            </div>
            <div class="feature-tag">
              <span class="tag-icon">🧠</span>
              <span>模型训练</span>
            </div>
            <div class="feature-tag">
              <span class="tag-icon">📈</span>
              <span>性能预测</span>
            </div>
            <div class="feature-tag">
              <span class="tag-icon">🔬</span>
              <span>实时监测</span>
            </div>
          </div>
        </div>

        <!-- 右侧主视觉 -->
        <div class="hero-right">
          <div class="visual-container">
            <!-- 主卡片 -->
            <div class="glass-card main-card">
              <div class="card-header">
                <div class="card-dots">
                  <span class="dot dot-red"></span>
                  <span class="dot dot-yellow"></span>
                  <span class="dot dot-green"></span>
                </div>
                <span class="card-title">DeepSight SynCore</span>
              </div>
              <div class="card-body">
                <div class="panel-row">
                  <div class="mini-panel">
                    <div class="panel-label">数据面板</div>
                    <div class="panel-chart">
                      <div class="chart-bar chart-1"></div>
                      <div class="chart-bar chart-2"></div>
                      <div class="chart-bar chart-3"></div>
                      <div class="chart-bar chart-4"></div>
                      <div class="chart-bar chart-5"></div>
                    </div>
                  </div>
                  <div class="mini-panel">
                    <div class="panel-label">模型训练</div>
                    <div class="progress-bar">
                      <div class="progress-fill"></div>
                    </div>
                    <span class="progress-text">87%</span>
                  </div>
                </div>
                <div class="panel-row">
                  <div class="mini-panel">
                    <div class="panel-label">预测结果</div>
                    <div class="prediction-value">128.5 MPa</div>
                  </div>
                  <div class="mini-panel">
                    <div class="panel-label">在线监测</div>
                    <div class="monitor-line">
                      <svg viewBox="0 0 100 30" preserveAspectRatio="none">
                        <path
                          d="M0 20 Q10 15 20 18 T40 12 T60 22 T80 10 T100 15"
                          fill="none"
                          stroke="url(#lineGradient)"
                          stroke-width="2"
                        />
                        <defs>
                          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stop-color="#ff6b9d" />
                            <stop offset="100%" stop-color="#7c3aed" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 漂浮小卡片 -->
            <div class="glass-card float-card card-1">
              <div class="float-icon">🔌</div>
              <div class="float-content">
                <div class="float-label">在线设备</div>
                <div class="float-value">12</div>
              </div>
            </div>

            <div class="glass-card float-card card-2">
              <div class="float-icon">📦</div>
              <div class="float-content">
                <div class="float-label">模型版本</div>
                <div class="float-value">v2.3</div>
              </div>
            </div>

            <div class="glass-card float-card card-3">
              <div class="float-icon">📉</div>
              <div class="float-content">
                <div class="float-label">R² 指标</div>
                <div class="float-value">0.94</div>
              </div>
            </div>

            <div class="glass-card float-card card-4">
              <div class="float-icon">⚡</div>
              <div class="float-content">
                <div class="float-label">预测响应</div>
                <div class="float-value">32ms</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- 底部细条 -->
    <footer class="landing-footer">
      <div class="footer-strip">
        <span>数据导入</span>
        <span class="separator">·</span>
        <span>模型训练</span>
        <span class="separator">·</span>
        <span>性能预测</span>
        <span class="separator">·</span>
        <span>监测闭环</span>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.landing-page {
  position: relative;
  min-height: 100vh;
  background: linear-gradient(135deg, #0f0f1a 0%, #1a1226 50%, #0d1117 100%);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 背景装饰 */
.bg-decor {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.5;
  animation: floatGlow 20s ease-in-out infinite;
}

.glow-1 {
  width: 400px;
  height: 400px;
  background: #ff6b9d;
  top: -100px;
  left: -100px;
  animation-delay: 0s;
}

.glow-2 {
  width: 500px;
  height: 500px;
  background: #7c3aed;
  top: 50%;
  right: -150px;
  animation-delay: -5s;
}

.glow-3 {
  width: 350px;
  height: 350px;
  background: #2d8a4e;
  bottom: -100px;
  left: 30%;
  animation-delay: -10s;
}

@keyframes floatGlow {
  0%, 100% {
    transform: translate(0, 0) scale(1);
  }
  33% {
    transform: translate(30px, -30px) scale(1.1);
  }
  66% {
    transform: translate(-20px, 20px) scale(0.9);
  }
}

.grid-pattern {
  position: absolute;
  inset: 0;
  background-image: 
    linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 50px 50px;
}

/* 顶部导航 */
.landing-nav {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 3rem;
  animation: fadeInDown 0.8s ease-out;
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.nav-logo {
  width: 44px;
  height: 44px;
  object-fit: contain;
}

.nav-brand {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.brand-name {
  font-size: 1.1rem;
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.02em;
}

.brand-sub {
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.nav-btn {
  padding: 0.55rem 1.25rem;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.nav-btn-login {
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: transparent;
  color: rgba(255, 255, 255, 0.85);
}

.nav-btn-login:hover {
  border-color: rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.05);
}

.nav-btn-register {
  border: none;
  background: linear-gradient(135deg, #ff6b9d 0%, #c44569 100%);
  color: #fff;
  box-shadow: 0 4px 20px rgba(255, 107, 157, 0.3);
}

.nav-btn-register:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(255, 107, 157, 0.4);
}

/* 主体内容 */
.landing-main {
  position: relative;
  z-index: 10;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 3rem;
}

.hero-content {
  width: 100%;
  max-width: 1400px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: center;
}

/* 左侧内容 */
.hero-left {
  animation: fadeInUp 0.8s ease-out 0.2s both;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.hero-tag {
  display: inline-block;
  padding: 0.35rem 0.85rem;
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.2), rgba(255, 107, 157, 0.1));
  border: 1px solid rgba(255, 107, 157, 0.2);
  color: #ffb3c6;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 1.5rem;
}

.hero-title {
  margin: 0 0 1rem;
  font-size: 3.25rem;
  font-weight: 800;
  line-height: 1.15;
  color: #fff;
  letter-spacing: -0.03em;
}

.highlight {
  background: linear-gradient(135deg, #ff6b9d 0%, #7c3aed 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-subtitle {
  margin: 0 0 2rem;
  font-size: 1.05rem;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.75);
}

.hero-buttons {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
}

.cta-btn {
  padding: 0.85rem 1.75rem;
  border-radius: 14px;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cta-btn-primary {
  border: none;
  background: linear-gradient(135deg, #ff6b9d 0%, #c44569 100%);
  color: #fff;
  box-shadow: 0 4px 20px rgba(255, 107, 157, 0.35);
}

.cta-btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 28px rgba(255, 107, 157, 0.45);
}

.cta-btn-secondary {
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.03);
  color: #fff;
  backdrop-filter: blur(10px);
}

.cta-btn-secondary:hover {
  border-color: rgba(255, 255, 255, 0.35);
  background: rgba(255, 255, 255, 0.08);
}

.feature-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.feature-tag {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.9rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.85rem;
  font-weight: 600;
}

.tag-icon {
  font-size: 1rem;
}

/* 右侧主视觉 */
.hero-right {
  animation: fadeInUp 0.8s ease-out 0.4s both;
}

.visual-container {
  position: relative;
  width: 100%;
  height: 500px;
}

/* 玻璃卡片 */
.glass-card {
  position: absolute;
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.main-card {
  width: 380px;
  height: 280px;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  animation: floatMain 6s ease-in-out infinite;
}

@keyframes floatMain {
  0%, 100% {
    transform: translate(-50%, -50%) translateY(0);
  }
  50% {
    transform: translate(-50%, -50%) translateY(-10px);
  }
}

.card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.card-dots {
  display: flex;
  gap: 6px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.dot-red {
  background: #ff6b6b;
}

.dot-yellow {
  background: #ffd93d;
}

.dot-green {
  background: #6bcb77;
}

.card-title {
  font-size: 0.82rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
}

.card-body {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.panel-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.mini-panel {
  padding: 0.75rem;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.panel-label {
  font-size: 0.72rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 0.5rem;
}

.panel-chart {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 50px;
}

.chart-bar {
  flex: 1;
  border-radius: 4px 4px 0 0;
  background: linear-gradient(180deg, #ff6b9d 0%, #7c3aed 100%);
}

.chart-1 {
  height: 40%;
}

.chart-2 {
  height: 70%;
}

.chart-3 {
  height: 55%;
}

.chart-4 {
  height: 85%;
}

.chart-5 {
  height: 60%;
}

.progress-bar {
  position: relative;
  height: 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  overflow: hidden;
}

.progress-fill {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 87%;
  border-radius: 999px;
  background: linear-gradient(90deg, #ff6b9d 0%, #7c3aed 100%);
}

.progress-text {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: #ffb3c6;
}

.prediction-value {
  font-size: 1.5rem;
  font-weight: 800;
  background: linear-gradient(135deg, #ff6b9d 0%, #7c3aed 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.monitor-line {
  width: 100%;
  height: 50px;
}

.monitor-line svg {
  width: 100%;
  height: 100%;
}

/* 漂浮小卡片 */
.float-card {
  width: 130px;
  padding: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.card-1 {
  left: 0;
  top: 10%;
  animation: floatCard1 7s ease-in-out infinite;
}

.card-2 {
  right: 0;
  top: 20%;
  animation: floatCard2 6s ease-in-out infinite;
}

.card-3 {
  left: 5%;
  bottom: 15%;
  animation: floatCard3 8s ease-in-out infinite;
}

.card-4 {
  right: 8%;
  bottom: 25%;
  animation: floatCard4 6.5s ease-in-out infinite;
}

@keyframes floatCard1 {
  0%, 100% {
    transform: translate(0, 0);
  }
  50% {
    transform: translate(10px, -15px);
  }
}

@keyframes floatCard2 {
  0%, 100% {
    transform: translate(0, 0);
  }
  50% {
    transform: translate(-12px, 12px);
  }
}

@keyframes floatCard3 {
  0%, 100% {
    transform: translate(0, 0);
  }
  50% {
    transform: translate(15px, 10px);
  }
}

@keyframes floatCard4 {
  0%, 100% {
    transform: translate(0, 0);
  }
  50% {
    transform: translate(-8px, -10px);
  }
}

.float-icon {
  font-size: 1.5rem;
}

.float-content {
  flex: 1;
  min-width: 0;
}

.float-label {
  font-size: 0.68rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 2px;
}

.float-value {
  font-size: 1.1rem;
  font-weight: 800;
  color: #fff;
}

/* 底部细条 */
.landing-footer {
  position: relative;
  z-index: 10;
  padding: 0.75rem 3rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(0, 0, 0, 0.15);
  animation: fadeInUp 0.8s ease-out 0.6s both;
}

.footer-strip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.separator {
  opacity: 0.3;
}

/* 响应式 */
@media (max-width: 1100px) {
  .hero-content {
    grid-template-columns: 1fr;
    gap: 3rem;
  }

  .hero-right {
    order: -1;
  }

  .visual-container {
    height: 400px;
    max-width: 500px;
    margin: 0 auto;
  }

  .main-card {
    width: 320px;
    height: 240px;
  }

  .float-card {
    width: 110px;
    padding: 0.7rem;
  }
}

@media (max-width: 768px) {
  .landing-nav {
    padding: 1rem 1.5rem;
  }

  .hero-title {
    font-size: 2.25rem;
  }

  .hero-subtitle {
    font-size: 0.95rem;
  }

  .hero-buttons {
    flex-direction: column;
  }

  .cta-btn {
    width: 100%;
  }

  .landing-main {
    padding: 1.5rem;
  }

  .visual-container {
    height: 350px;
  }

  .main-card {
    width: 280px;
    height: 220px;
  }

  .float-card {
    display: none;
  }

  .landing-footer {
    padding: 0.75rem 1.5rem;
  }

  .footer-strip {
    font-size: 0.7rem;
  }
}
</style>
