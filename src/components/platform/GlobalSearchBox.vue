<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { useProjectWorkspace } from "../../stores/projectWorkspaceStore.js";

const props = defineProps({
  modelValue: { type: String, default: "" },
  placeholder: { type: String, default: "搜索项目、设备、监测任务…" },
});

const emit = defineEmits(["update:modelValue"]);

const router = useRouter();
const { projects, recentMonitorTasks } = useProjectWorkspace();

const searchQuery = ref(props.modelValue);
const showDropdown = ref(false);
const highlightedIndex = ref(-1);
let debounceTimer = null;

const DEBOUNCE_DELAY = 200;

// 格式化时间显示
function formatTime(isoStr) {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// 生成搜索项
const allSearchItems = computed(() => {
  const items = [];

  // 项目
  projects.value.forEach((p) => {
    items.push({
      id: p.id,
      type: "project",
      title: p.name,
      subtitle: p.description || "更新于 " + formatTime(p.updated_at),
      route: `/project/${p.id}/center`,
    });
  });

  // 监测任务
  recentMonitorTasks.value.forEach((t) => {
    const project = projects.value.find((p) => p.id === t.projectId);
    const projectName = project?.name || "";
    items.push({
      id: `${t.projectId}_${t.taskId}`,
      type: "task",
      title: t.taskName || `任务 #${t.taskId}`,
      subtitle: projectName ? `${projectName} · ${formatTime(t.at)}` : formatTime(t.at),
      route: `/project/${t.projectId}/monitoring?taskId=${t.taskId}`,
      projectId: t.projectId,
      taskId: t.taskId,
    });
  });

  // 设备（从监测任务中提取）
  const seenDevices = new Set();
  recentMonitorTasks.value.forEach((t) => {
    if (t.deviceId && !seenDevices.has(t.deviceId)) {
      seenDevices.add(t.deviceId);
      const project = projects.value.find((p) => p.id === t.projectId);
      const projectName = project?.name || "";
      items.push({
        id: `device_${t.deviceId}`,
        type: "device",
        title: t.deviceId,
        subtitle: projectName ? `${projectName} · 关联设备` : "关联设备",
        route: `/project/${t.projectId}/monitoring?deviceId=${encodeURIComponent(t.deviceId)}`,
        projectId: t.projectId,
        deviceId: t.deviceId,
      });
    }
  });

  return items;
});

// 搜索结果
const searchResults = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return [];

  const results = allSearchItems.value.filter((item) => {
    return (
      item.title.toLowerCase().includes(q) ||
      item.subtitle.toLowerCase().includes(q)
    );
  });

  // 按类型分组
  const groups = {
    project: [],
    device: [],
    task: [],
  };

  results.forEach((item) => {
    if (groups[item.type]) {
      groups[item.type].push(item);
    }
  });

  // 只返回有结果的分组
  return Object.entries(groups)
    .filter(([_, items]) => items.length > 0)
    .map(([type, items]) => ({ type, items }));
});

// 处理输入变化
function handleInput(e) {
  searchQuery.value = e.target.value;
  emit("update:modelValue", e.target.value);
  showDropdown.value = true;
  highlightedIndex.value = -1;

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
}

// 处理搜索框聚焦
function handleFocus() {
  if (searchQuery.value.trim()) {
    showDropdown.value = true;
  }
}

// 处理搜索框失焦
function handleBlur() {
  // 延迟关闭，让用户有时间点击结果
  setTimeout(() => {
    showDropdown.value = false;
  }, 150);
}

// 处理结果点击
function handleItemClick(item) {
  showDropdown.value = false;
  searchQuery.value = "";
  emit("update:modelValue", "");
  router.push(item.route);
}

// 键盘导航
function handleKeydown(e) {
  if (!showDropdown.value || searchResults.value.length === 0) return;

  // 计算总结果数
  const totalItems = searchResults.value.reduce(
    (sum, group) => sum + group.items.length,
    0
  );

  switch (e.key) {
    case "ArrowDown":
      e.preventDefault();
      highlightedIndex.value =
        highlightedIndex.value < totalItems - 1
          ? highlightedIndex.value + 1
          : 0;
      break;
    case "ArrowUp":
      e.preventDefault();
      highlightedIndex.value =
        highlightedIndex.value > 0
          ? highlightedIndex.value - 1
          : totalItems - 1;
      break;
    case "Enter":
      e.preventDefault();
      if (highlightedIndex.value >= 0) {
        const item = getFlattenedResults()[highlightedIndex.value];
        if (item) {
          handleItemClick(item);
        }
      }
      break;
    case "Escape":
      showDropdown.value = false;
      highlightedIndex.value = -1;
      break;
  }
}

// 获取扁平化结果用于键盘导航
function getFlattenedResults() {
  return searchResults.value.flatMap((group) => group.items);
}

// 类型显示名称
const typeLabels = {
  project: "项目",
  device: "设备",
  task: "监测任务",
};

// 监听外部 modelValue 变化
watch(
  () => props.modelValue,
  (val) => {
    searchQuery.value = val;
  }
);

onMounted(() => {
  document.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener("keydown", handleKeydown);
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
});
</script>

<template>
  <div class="global-search-box">
    <label class="search-label">
      <span class="sr-only">搜索</span>
      <svg class="search-ico" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="6" fill="none" stroke="currentColor" stroke-width="2" />
        <path d="M15 15l4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      </svg>
      <input
        :value="searchQuery"
        @input="handleInput"
        @focus="handleFocus"
        @blur="handleBlur"
        type="search"
        class="search-input"
        :placeholder="placeholder"
        autocomplete="off"
      />
    </label>

    <div v-if="showDropdown && searchResults.length > 0" class="search-dropdown">
      <div v-for="group in searchResults" :key="group.type" class="search-group">
        <div class="group-label">{{ typeLabels[group.type] }}</div>
        <div class="group-items">
          <button
            v-for="(item, idx) in group.items"
            :key="item.id"
            type="button"
            class="search-item"
            :class="{ highlighted: getFlattenedResults().indexOf(item) === highlightedIndex }"
            @mousedown.prevent="handleItemClick(item)"
          >
            <div class="item-title">{{ item.title }}</div>
            <div v-if="item.subtitle" class="item-subtitle">{{ item.subtitle }}</div>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

.global-search-box {
  position: relative;
  width: 100%;
}

.search-label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.32rem 0.65rem;
  border: 1px solid #cfe2cf;
  border-radius: 10px;
  background: #f8fbf8;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.search-label:focus-within {
  border-color: #81c784;
  background: #fff;
}

.search-ico {
  width: 17px;
  height: 17px;
  color: #6b8f72;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  font-size: 0.86rem;
  color: #2e4a32;
  outline: none;
}

.search-input::placeholder {
  color: #93a898;
}

.search-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  min-width: 260px;
  max-height: 360px;
  overflow-y: auto;
  background: #fff;
  border: 1px solid #c8e6c9;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(27, 94, 32, 0.15);
  z-index: 1000;
}

.search-group {
  padding: 0.25rem 0;
}

.search-group + .search-group {
  border-top: 1px solid #e8f5e9;
}

.group-label {
  padding: 0.35rem 0.75rem;
  font-size: 0.72rem;
  font-weight: 600;
  color: #6b8f72;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.group-items {
  display: flex;
  flex-direction: column;
}

.search-item {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  padding: 0.45rem 0.75rem;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background 0.12s ease;
}

.search-item:hover,
.search-item.highlighted {
  background: #f5fbf6;
}

.item-title {
  font-size: 0.88rem;
  font-weight: 600;
  color: #2e4a31;
  line-height: 1.3;
}

.item-subtitle {
  font-size: 0.76rem;
  color: #6b8f72;
  line-height: 1.3;
}
</style>
