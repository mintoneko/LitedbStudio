<template>
  <div class="app-layout">
    <!-- Mobile Drawer Overlay Backdrop -->
    <div
      v-if="isMobileMenuOpen"
      class="mobile-drawer-overlay"
      @click="isMobileMenuOpen = false"
    ></div>

    <!-- Sidebar (Responsive Drawer on Mobile) -->
    <aside :class="['sidebar', isMobileMenuOpen ? 'open' : '']">
      <div class="sidebar-header-row flex-between">
        <div
          class="brand"
          role="button"
          tabindex="0"
          title="返回主页"
          @click="switchTab('dashboard')"
          @keydown.enter="switchTab('dashboard')"
        >
          <div class="logo-icon">
            <Database :size="20" />
          </div>
          <div class="brand-text">
            <span class="brand-name">LiteDB</span>
            <span class="brand-badge">Studio</span>
          </div>
        </div>

        <!-- Mobile Close Drawer Button -->
        <button
          class="btn-icon mobile-close-btn"
          aria-label="关闭菜单"
          @click="isMobileMenuOpen = false"
        >
          <X :size="18" />
        </button>
      </div>

      <nav class="nav-menu">
        <button
          :class="['nav-item', currentTab === 'dashboard' ? 'active' : '']"
          @click="switchTab('dashboard')"
        >
          <LayoutGrid :size="18" />
          <span>概览与监控</span>
        </button>

        <button
          :class="['nav-item', currentTab === 'collections' ? 'active' : '']"
          @click="switchTab('collections')"
        >
          <FolderKanban :size="18" />
          <span>集合与数据</span>
        </button>

        <button
          :class="['nav-item', currentTab === 'auth' ? 'active' : '']"
          @click="switchTab('auth')"
        >
          <Key :size="18" />
          <span>API 密钥授权</span>
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
        <button class="btn btn-secondary btn-sm full-width" @click="openSettings">
          <Settings :size="14" />
          <span>连接设置</span>
        </button>
      </div>
    </aside>

    <!-- Main Content Area -->
    <main class="main-content">
      <!-- Topbar -->
      <header class="topbar">
        <div class="topbar-left-group flex-center gap-3">
          <!-- Mobile Hamburger Toggle Button -->
          <button
            class="btn-icon mobile-menu-toggle"
            aria-label="打开菜单"
            @click="isMobileMenuOpen = true"
          >
            <Menu :size="20" />
          </button>

          <div class="topbar-title-group">
            <h1>{{ currentHeading.title }}</h1>
            <span class="subtext">{{ currentHeading.subtext }}</span>
          </div>
        </div>

        <div class="topbar-actions flex-center gap-2">
          <!-- 3-Segment Theme Mode Switcher -->
          <div class="theme-segmented-switch">
            <button
              :class="['theme-segment-btn', themeMode === 'system' ? 'active' : '']"
              title="跟随系统外观"
              @click="setThemeMode('system')"
            >
              <Monitor :size="13" />
              <span>系统</span>
            </button>
            <button
              :class="['theme-segment-btn', themeMode === 'light' ? 'active' : '']"
              title="浅色明亮模式"
              @click="setThemeMode('light')"
            >
              <Sun :size="13" />
              <span>浅色</span>
            </button>
            <button
              :class="['theme-segment-btn', themeMode === 'dark' ? 'active' : '']"
              title="深色暗黑模式"
              @click="setThemeMode('dark')"
            >
              <Moon :size="13" />
              <span>深色</span>
            </button>
          </div>

          <!-- Context-Aware Topbar Action Button -->
          <button
            v-if="currentTab === 'auth'"
            class="btn btn-primary"
            @click="openCreateApiKey"
          >
            <Plus :size="16" />
            <span>新建 API 密钥</span>
          </button>

          <button
            v-else-if="currentTab === 'collections' || currentTab === 'dashboard'"
            class="btn btn-primary"
            @click="openCreateCollection"
          >
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

        <AuthManagerView v-else-if="currentTab === 'auth'" />

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
  Key,
  HardDriveDownload,
  Settings,
  Plus,
  Sun,
  Moon,
  Menu,
  X,
  Monitor
} from 'lucide-vue-next';

import { useLiteDB } from './composables/useLiteDB.js';
import DashboardView from './components/DashboardView.vue';
import CollectionsView from './components/CollectionsView.vue';
import AuthManagerView from './components/AuthManagerView.vue';
import BackupRestoreView from './components/BackupRestoreView.vue';
import SettingsModal from './components/SettingsModal.vue';
import CreateCollectionModal from './components/CreateCollectionModal.vue';
import CreateApiKeyModal from './components/CreateApiKeyModal.vue';
import ConfirmModal from './components/ConfirmModal.vue';
import ToastNotification from './components/ToastNotification.vue';

const {
  theme,
  themeMode,
  setThemeMode,
  toggleTheme,
  endpoint,
  isConnected,
  isSettingsOpen,
  openCreateCollection,
  openCreateApiKey,
  checkConnection
} = useLiteDB();

const isMobileMenuOpen = ref(false);

const validTabs = ['dashboard', 'collections', 'auth', 'backup'];

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
  const collection = parts[1] ? decodeURIComponent(parts[1]) : '';
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
  } else {
    localStorage.removeItem('litedb_last_collection');
  }
};

const switchTab = (tab) => {
  currentTab.value = tab;
  updateUrlHash(tab, tab === 'collections' ? targetCollection.value : '');
  isMobileMenuOpen.value = false;
};

const openSettings = () => {
  isSettingsOpen.value = true;
  isMobileMenuOpen.value = false;
};

const handleSelectCollection = (colName) => {
  targetCollection.value = colName || '';
  updateUrlHash('collections', colName || '');
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
  targetCollection.value = collection || '';
};

const headings = {
  dashboard: { title: '概览与监控', subtext: 'LiteDB 运行状态与核心数据总览' },
  collections: { title: '集合与数据工作台', subtext: '管理所有集合，可视化浏览与编辑 JSON 文档' },
  auth: { title: 'API 密钥授权管理', subtext: '生成与管理供前端或桌面端调用的访问密钥' },
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
  position: relative;
  overflow: hidden;
}

/* Sidebar (Desktop) */
.sidebar {
  width: 260px;
  background-color: var(--bg-sidebar);
  border-right: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: background-color 0.2s, border-color 0.2s, transform 0.25s ease;
  z-index: 100;
}

.sidebar-header-row {
  border-bottom: 1px solid var(--border-subtle);
}

.brand {
  padding: 20px 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.15s ease, opacity 0.15s ease;
  flex: 1;
}

.brand:hover {
  background-color: var(--table-hover-bg);
}

.brand:hover .brand-name {
  color: var(--color-primary);
}

.brand:active {
  opacity: 0.85;
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

.mobile-close-btn {
  display: none;
  margin-right: 12px;
}

.nav-menu {
  padding: 16px 12px;
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
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
  color: var(--color-primary);
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
  min-width: 0;
}

.topbar {
  padding: 18px 28px;
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
  gap: 12px;
}

.topbar-left-group {
  min-width: 0;
}

.mobile-menu-toggle {
  display: none;
}

.topbar-title-group h1 {
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.topbar-title-group .subtext {
  font-size: 0.75rem;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}

.topbar-actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

/* 3-Segment Theme Switcher */
.theme-segmented-switch {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  background: var(--bg-input);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  padding: 3px;
  user-select: none;
}

.theme-segment-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 9px;
  font-size: 0.76rem;
  font-weight: 500;
  color: var(--text-muted);
  background: transparent;
  border: 1px solid transparent;
  border-radius: calc(var(--radius-sm) - 2px);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.theme-segment-btn:hover:not(.active) {
  color: var(--text-main);
  background: var(--table-hover-bg);
}

.theme-segment-btn.active {
  background: var(--bg-card);
  border-color: var(--border-subtle);
  color: var(--text-main);
  font-weight: 600;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}

[data-theme='light'] .theme-segment-btn.active {
  background: #ffffff;
  color: var(--color-primary);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.tab-view-container {
  padding: 24px;
  animation: fadeIn 0.2s ease;
  flex: 1;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Mobile & Tablet Adaptation */
.mobile-drawer-overlay {
  display: none;
}

@media (max-width: 768px) {
  .mobile-drawer-overlay {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(3px);
    z-index: 1040;
    animation: fadeIn 0.15s ease;
  }

  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    width: 280px;
    max-width: 80vw;
    z-index: 1050;
    transform: translateX(-100%);
    box-shadow: none;
  }

  .sidebar.open {
    transform: translateX(0);
    box-shadow: 4px 0 25px rgba(0, 0, 0, 0.5);
  }

  .mobile-close-btn {
    display: flex;
  }

  .mobile-menu-toggle {
    display: flex;
  }

  .topbar {
    padding: 12px 16px;
  }

  .topbar-title-group h1 {
    font-size: 1.1rem;
  }

  .topbar-title-group .subtext {
    display: none; /* Hide subtext on mobile to save vertical space */
  }

  .tab-view-container {
    padding: 14px 12px;
  }
}
</style>
