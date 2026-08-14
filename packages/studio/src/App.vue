<template>
  <div class="app-layout">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="brand">
        <div class="logo-icon">
          <Database :size="20" />
        </div>
        <div class="brand-text">
          <span class="brand-name">LiteDB</span>
          <span class="brand-badge">Studio</span>
        </div>
      </div>

      <nav class="nav-menu">
        <button
          :class="['nav-item', currentTab === 'dashboard' ? 'active' : '']"
          @click="switchTab('dashboard')"
        >
          <LayoutGrid :size="18" />
          <span>概览与监控</span>
        </button>

        <div class="nav-section-title">数据管理</div>
        <button
          :class="['nav-item', currentTab === 'collections' ? 'active' : '']"
          @click="switchTab('collections')"
        >
          <FolderKanban :size="18" />
          <span>集合与数据</span>
        </button>

        <button
          :class="['nav-item', currentTab === 'sql' ? 'active' : '']"
          @click="switchTab('sql')"
        >
          <Terminal :size="18" />
          <span>SQL 工作台</span>
        </button>

        <div class="nav-section-title">开发与设置</div>
        <button
          :class="['nav-item', currentTab === 'auth' ? 'active' : '']"
          @click="switchTab('auth')"
        >
          <Key :size="18" />
          <span>API 密钥授权</span>
        </button>

        <button
          :class="['nav-item', currentTab === 'codegen' ? 'active' : '']"
          @click="switchTab('codegen')"
        >
          <Code2 :size="18" />
          <span>API 代码生成器</span>
        </button>

        <button
          :class="['nav-item', currentTab === 'backup' ? 'active' : '']"
          @click="switchTab('backup')"
        >
          <HardDriveDownload :size="18" />
          <span>备份与导入</span>
        </button>
      </nav>

      <div class="sidebar-footer">
        <div :class="['status-indicator', isConnected ? 'online' : 'offline']">
          <span class="dot"></span>
          <span class="status-text">
            {{ isConnected ? `已连接: ${endpoint}` : '未连接服务' }}
          </span>
        </div>
        <button class="btn btn-secondary btn-sm full-width" @click="isSettingsOpen = true">
          <Settings :size="14" />
          <span>连接设置 (API Key)</span>
        </button>
      </div>
    </aside>

    <!-- Main Content Area -->
    <main class="main-content">
      <!-- Topbar -->
      <header class="topbar">
        <div class="topbar-title-group">
          <h1>{{ currentHeading.title }}</h1>
          <span class="subtext">{{ currentHeading.subtext }}</span>
        </div>
        <div class="topbar-actions flex-center gap-2">
          <!-- Theme Toggle Button -->
          <button
            class="btn-icon"
            :title="theme === 'dark' ? '切换为浅色明亮模式' : '切换为纯黑暗黑模式'"
            @click="toggleTheme"
          >
            <Sun v-if="theme === 'dark'" :size="16" />
            <Moon v-else :size="16" />
          </button>

          <button class="btn btn-primary" @click="openCreateCollection">
            <Plus :size="16" />
            <span>新建集合</span>
          </button>
        </div>
      </header>

      <!-- Tab Content Area -->
      <div class="tab-view-container">
        <DashboardView
          v-if="currentTab === 'dashboard'"
          @goto-collection="handleGotoCollection"
        />

        <CollectionsView
          v-else-if="currentTab === 'collections'"
          :initial-collection="targetCollection"
          @select-collection="handleSelectCollection"
        />

        <SqlConsoleView v-else-if="currentTab === 'sql'" />

        <AuthManagerView v-else-if="currentTab === 'auth'" />

        <CodeGenView v-else-if="currentTab === 'codegen'" />

        <BackupRestoreView v-else-if="currentTab === 'backup'" />
      </div>
    </main>

    <!-- Global Modals & Notifications -->
    <SettingsModal />
    <CreateCollectionModal @created="handleCollectionCreated" />
    <CreateApiKeyModal />
    <ConfirmModal />
    <ToastNotification />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import {
  Database,
  LayoutGrid,
  FolderKanban,
  Terminal,
  Key,
  Code2,
  HardDriveDownload,
  Settings,
  Plus,
  Sun,
  Moon
} from 'lucide-vue-next';

import { useLiteDB } from './composables/useLiteDB.js';
import DashboardView from './components/DashboardView.vue';
import CollectionsView from './components/CollectionsView.vue';
import SqlConsoleView from './components/SqlConsoleView.vue';
import AuthManagerView from './components/AuthManagerView.vue';
import CodeGenView from './components/CodeGenView.vue';
import BackupRestoreView from './components/BackupRestoreView.vue';
import SettingsModal from './components/SettingsModal.vue';
import CreateCollectionModal from './components/CreateCollectionModal.vue';
import CreateApiKeyModal from './components/CreateApiKeyModal.vue';
import ConfirmModal from './components/ConfirmModal.vue';
import ToastNotification from './components/ToastNotification.vue';

const {
  theme,
  toggleTheme,
  endpoint,
  isConnected,
  isSettingsOpen,
  openCreateCollection,
  checkConnection
} = useLiteDB();

const validTabs = ['dashboard', 'collections', 'sql', 'auth', 'codegen', 'backup'];

// Persistent Tab & Collection state from URL Hash or localStorage
const parseRouteFromHash = () => {
  const hash = window.location.hash.replace(/^#\/?/, '').trim();
  if (!hash) {
    const savedTab = localStorage.getItem('litedb_last_tab') || 'dashboard';
    const savedCol = localStorage.getItem('litedb_last_collection') || '';
    return {
      tab: validTabs.includes(savedTab) ? savedTab : 'dashboard',
      collection: savedCol
    };
  }

  const parts = hash.split('/');
  const tab = validTabs.includes(parts[0]) ? parts[0] : 'dashboard';
  const collection = parts[1] || localStorage.getItem('litedb_last_collection') || '';
  return { tab, collection };
};

const initialRoute = parseRouteFromHash();
const currentTab = ref(initialRoute.tab);
const targetCollection = ref(initialRoute.collection);

const updateUrlHash = (tab, col = '') => {
  let newHash = `#/${tab}`;
  if (tab === 'collections' && col) {
    newHash = `#/${tab}/${encodeURIComponent(col)}`;
  }
  if (window.location.hash !== newHash) {
    window.location.hash = newHash;
  }
  localStorage.setItem('litedb_last_tab', tab);
  if (col) {
    localStorage.setItem('litedb_last_collection', col);
  }
};

const switchTab = (tab) => {
  currentTab.value = tab;
  updateUrlHash(tab, tab === 'collections' ? targetCollection.value : '');
};

const handleSelectCollection = (colName) => {
  targetCollection.value = colName;
  updateUrlHash('collections', colName);
};

const handleGotoCollection = (colName) => {
  targetCollection.value = colName;
  currentTab.value = 'collections';
  updateUrlHash('collections', colName);
};

const handleCollectionCreated = (colName) => {
  targetCollection.value = colName;
  currentTab.value = 'collections';
  updateUrlHash('collections', colName);
};

const syncFromHash = () => {
  const { tab, collection } = parseRouteFromHash();
  currentTab.value = tab;
  if (collection) {
    targetCollection.value = collection;
  }
};

const headings = {
  dashboard: { title: '概览与监控', subtext: 'LiteDB 运行状态与核心数据总览' },
  collections: { title: '集合与数据工作台', subtext: '管理所有集合，可视化浏览与编辑 JSON 文档' },
  sql: { title: 'SQL 终端控制台', subtext: '直接执行原生 SQLite 查询与结构分析' },
  auth: { title: 'API 密钥授权管理', subtext: '生成与管理供前端或桌面端调用的访问密钥' },
  codegen: { title: 'API 代码生成器', subtext: '开箱即用的前端与客户端调用代码片段' },
  backup: { title: '数据备份与恢复', subtext: '全量 JSON 快照导出与一键导入' }
};

const currentHeading = computed(() => {
  return headings[currentTab.value] || headings.dashboard;
});

onMounted(() => {
  checkConnection();
  // Ensure hash is in URL for bookmarking
  updateUrlHash(currentTab.value, targetCollection.value);
  window.addEventListener('hashchange', syncFromHash);
});

onUnmounted(() => {
  window.removeEventListener('hashchange', syncFromHash);
});
</script>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  width: 100vw;
  background-color: var(--bg-app);
}

/* Sidebar */
.sidebar {
  width: 260px;
  background-color: var(--bg-sidebar);
  border-right: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: background-color 0.2s, border-color 0.2s;
}

.brand {
  padding: 20px 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid var(--border-subtle);
}

.logo-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  background: linear-gradient(135deg, #0284c7, #06b6d4);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 2px 10px rgba(6, 182, 212, 0.3);
}

.brand-name {
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text-main);
}

.brand-badge {
  font-size: 0.65rem;
  text-transform: uppercase;
  background: rgba(56, 189, 248, 0.12);
  color: #38bdf8;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
  margin-left: 6px;
}

.nav-menu {
  padding: 16px 12px;
  flex: 1;
  overflow-y: auto;
}

.nav-section-title {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-dim);
  padding: 14px 12px 6px;
  font-weight: 600;
}

.nav-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
}

.nav-item:hover {
  background: var(--table-hover-bg);
  color: var(--text-main);
}

.nav-item.active {
  background: rgba(2, 132, 199, 0.15);
  color: #38bdf8;
  font-weight: 600;
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.75rem;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-indicator .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-success);
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
  flex-shrink: 0;
}

.status-indicator.offline .dot {
  background: var(--color-danger);
  box-shadow: 0 0 8px rgba(239, 68, 68, 0.6);
}

/* Main Area */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  background-color: var(--bg-app);
  transition: background-color 0.2s;
}

.topbar {
  padding: 20px 32px;
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--topbar-bg);
  backdrop-filter: blur(8px);
  position: sticky;
  top: 0;
  z-index: 10;
  transition: background-color 0.2s, border-color 0.2s;
}

.topbar-title-group h1 {
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.topbar-title-group .subtext {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.tab-view-container {
  padding: 32px;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
