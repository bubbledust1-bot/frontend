import { createApp } from "vue";
import App from "./App.vue";
import router from "./router/index.js";
import "./styles/platform.css";
import { initAuth } from "./stores/authStore.js";

const app = createApp(App);
app.use(router);

// 初始化认证状态
initAuth().then(() => {
  app.mount("#app");
});
