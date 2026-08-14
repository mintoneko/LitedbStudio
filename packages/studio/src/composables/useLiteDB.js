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
const isConnected = ref(false);
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

// Initialize Theme: Default to System Preference if not manually set
const savedTheme = localStorage.getItem('litedb_theme');
const initialTheme = savedTheme || getSystemTheme();
const theme = ref(initialTheme);
document.documentElement.setAttribute('data-theme', initialTheme);

// Listen to OS system color scheme changes dynamically
if (typeof window !== 'undefined' && window.matchMedia) {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', (e) => {
    if (!localStorage.getItem('litedb_theme')) {
      const newSysTheme = e.matches ? 'dark' : 'light';
      theme.value = newSysTheme;
      document.documentElement.setAttribute('data-theme', newSysTheme);
    }
  });
}

const stats = ref({
  path: '-',
  driver: 'SQLite WAL',
  fileSizeBytes: 0,
  fileSizeFormatted: '-',
  collectionsCount: 0,
  totalDocuments: 0,
  apiKeysCount: 0,
  memoryUsage: { rss: 0, heapUsed: 0 }
});

const collections = ref([]);
const toasts = ref([]);

export function useLiteDB() {
  const toggleTheme = () => {
    theme.value = theme.value === 'dark' ? 'light' : 'dark';
    localStorage.setItem('litedb_theme', theme.value);
    document.documentElement.setAttribute('data-theme', theme.value);
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
    } catch {
      // ignore
    }
  };

  const refreshCollections = async () => {
    try {
      const cols = await apiRequest('/api/collections');
      collections.value = cols || [];
    } catch {
      // ignore
    }
  };

  return {
    theme,
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
