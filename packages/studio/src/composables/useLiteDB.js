import { ref } from 'vue';

// System Theme Detector
function getSystemTheme() {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
}

// Global singleton reactive state
const endpoint = ref(localStorage.getItem('litedb_endpoint') || window.location.origin);
if (endpoint.value.startsWith('null') || endpoint.value.startsWith('file:')) {
  endpoint.value = 'http://localhost:3000';
}

const apiKey = ref(localStorage.getItem('litedb_apikey') || '');
const isConnected = ref(Boolean(apiKey.value));
const isConnecting = ref(false);
const isSettingsOpen = ref(false);
const isCreateCollectionOpen = ref(false);
const isCreateApiKeyOpen = ref(false);

// Global confirmation modal state
const confirmState = ref({
  isOpen: false,
  title: '操作确认',
  message: '请确认是否继续执行此操作？',
  confirmText: '确定',
  cancelText: '取消',
  type: 'danger', // 'danger' | 'warning' | 'info'
  resolve: null
});

// Initialize Theme Mode: 'system' | 'light' | 'dark'
const savedThemeMode = localStorage.getItem('litedb_theme_mode') || localStorage.getItem('litedb_theme') || 'system';
const themeMode = ref(savedThemeMode);
const theme = ref(savedThemeMode === 'system' ? getSystemTheme() : savedThemeMode);

function applyTheme(mode) {
  let activeTheme = mode;
  if (mode === 'system') {
    activeTheme = getSystemTheme();
  }
  theme.value = activeTheme;
  document.documentElement.setAttribute('data-theme', activeTheme);
}

// Initial apply
applyTheme(themeMode.value);

// Listen to OS system color scheme changes dynamically
if (typeof window !== 'undefined' && window.matchMedia) {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', () => {
    if (themeMode.value === 'system') {
      applyTheme('system');
    }
  });
}

function getCachedStats() {
  try {
    const cached = localStorage.getItem('litedb_cached_stats');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {}
  return {
    path: '-',
    driver: 'SQLite WAL',
    fileSizeBytes: 0,
    fileSizeFormatted: '0 B',
    collectionsCount: 0,
    totalDocuments: 0,
    apiKeysCount: 0,
    memoryUsage: { rss: 0, heapUsed: 0 }
  };
}

function getCachedCollections() {
  try {
    const cached = localStorage.getItem('litedb_cached_collections');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

const stats = ref(getCachedStats());
const collections = ref(getCachedCollections());
const toasts = ref([]);

export function useLiteDB() {
  const setThemeMode = (mode) => {
    themeMode.value = mode;
    localStorage.setItem('litedb_theme_mode', mode);
    localStorage.setItem('litedb_theme', mode);
    applyTheme(mode);
  };

  const toggleTheme = () => {
    const nextMode = themeMode.value === 'dark' ? 'light' : themeMode.value === 'light' ? 'system' : 'dark';
    setThemeMode(nextMode);
  };

  const showToast = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    toasts.value.push({ id, message, type });
    setTimeout(() => {
      toasts.value = toasts.value.filter(t => t.id !== id);
    }, 3200);
  };

  const showConfirm = ({
    title = '操作确认',
    message = '请确认是否继续此操作？',
    confirmText = '确定',
    cancelText = '取消',
    type = 'danger'
  } = {}) => {
    return new Promise((resolve) => {
      confirmState.value = {
        isOpen: true,
        title,
        message,
        confirmText,
        cancelText,
        type,
        resolve
      };
    });
  };

  const resolveConfirm = (confirmed) => {
    if (confirmState.value.resolve) {
      confirmState.value.resolve(confirmed);
    }
    confirmState.value.isOpen = false;
  };

  const openCreateCollection = () => {
    isCreateCollectionOpen.value = true;
  };

  const closeCreateCollection = () => {
    isCreateCollectionOpen.value = false;
  };

  const openCreateApiKey = () => {
    isCreateApiKeyOpen.value = true;
  };

  const closeCreateApiKey = () => {
    isCreateApiKeyOpen.value = false;
  };

  const setEndpointAndKey = (newEp, newKey) => {
    endpoint.value = (newEp || 'http://localhost:3000').replace(/\/$/, '');
    apiKey.value = newKey || '';
    localStorage.setItem('litedb_endpoint', endpoint.value);
    localStorage.setItem('litedb_apikey', apiKey.value);
    checkConnection();
  };

  const apiRequest = async (path, options = {}) => {
    const url = `${endpoint.value}${path}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(apiKey.value ? { 'Authorization': `Bearer ${apiKey.value}` } : {}),
      ...(options.headers || {})
    };

    try {
      const res = await fetch(url, {
        method: options.method || 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) {
        const msg = json.error?.message || `HTTP ${res.status} 请求失败`;
        const err = new Error(msg);
        err.status = res.status;
        throw err;
      }
      return json.data !== undefined ? json.data : json;
    } catch (err) {
      throw err;
    }
  };

  const checkConnection = async () => {
    isConnecting.value = true;
    if (!apiKey.value) {
      isConnected.value = false;
      isConnecting.value = false;
      isSettingsOpen.value = true;
      showToast('首次访问请在弹窗中配置Admin API Key', 'info');
      return false;
    }

    try {
      await apiRequest('/api/auth/verify');
      isConnected.value = true;
      await refreshStats();
      await refreshCollections();
      return true;
    } catch (err) {
      isConnected.value = false;
      isSettingsOpen.value = true;
      showToast(`连接校验失败: ${err.message}`, 'error');
      return false;
    } finally {
      isConnecting.value = false;
    }
  };

  const refreshStats = async () => {
    try {
      const data = await apiRequest('/api/system/stats');
      stats.value = data;
      try {
        localStorage.setItem('litedb_cached_stats', JSON.stringify(data));
      } catch {}
    } catch {
      // ignore
    }
  };

  const refreshCollections = async () => {
    try {
      const cols = await apiRequest('/api/collections');
      collections.value = cols || [];
      try {
        localStorage.setItem('litedb_cached_collections', JSON.stringify(cols || []));
      } catch {}
    } catch {
      // ignore
    }
  };

  return {
    theme,
    themeMode,
    setThemeMode,
    toggleTheme,
    endpoint,
    apiKey,
    isConnected,
    isConnecting,
    isSettingsOpen,
    isCreateCollectionOpen,
    isCreateApiKeyOpen,
    confirmState,
    stats,
    collections,
    toasts,
    showToast,
    showConfirm,
    resolveConfirm,
    openCreateCollection,
    closeCreateCollection,
    openCreateApiKey,
    closeCreateApiKey,
    setEndpointAndKey,
    apiRequest,
    checkConnection,
    refreshStats,
    refreshCollections
  };
}
