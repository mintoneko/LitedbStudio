import { ref, computed } from 'vue';

// System Theme Detector
function getSystemTheme() {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
}

function formatErrorMessage(msg) {
  if (!msg) return '操作失败，请重试';
  if (typeof msg !== 'string') return String(msg);
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
    return '无法连接到 LiteDB 服务器，请检查网络或服务运行状态';
  }
  if (msg.includes('Forbidden') || msg.includes('Requires')) {
    return msg
      .replace(/Forbidden:\s*Requires\s*'([^']+)'\s*role\s*\(current:\s*'([^']+)'\)/i, '权限不足：该操作需要 "$1" 管理员权限（当前身份为 "$2"）')
      .replace(/Requires\s*'admin'/i, '需要超级管理员 (admin) 权限')
      .replace(/Requires\s*'write'/i, '需要读写 (write) 权限');
  }
  if (msg.includes('Unauthorized') || msg.includes('Invalid API Key') || msg.includes('API Key required')) {
    return '未授权：API 密钥无效或未提供，请在连接设置中配置';
  }
  return msg;
}

// Global singleton reactive state
const endpoint = ref(localStorage.getItem('litedb_endpoint') || window.location.origin);
if (endpoint.value.startsWith('null') || endpoint.value.startsWith('file:')) {
  endpoint.value = 'http://localhost:3000';
}

const apiKey = ref(localStorage.getItem('litedb_apikey') || '');
const currentRole = ref(localStorage.getItem('litedb_user_role') || 'admin');
const isAdmin = computed(() => currentRole.value === 'admin');
const isWrite = computed(() => currentRole.value === 'admin' || currentRole.value === 'write' || currentRole.value === 'read-write');
const isReadOnly = computed(() => currentRole.value === 'read' || currentRole.value === 'read-only');

const isConnected = ref(Boolean(apiKey.value));
const isConnecting = ref(false);
const isSettingsOpen = ref(false);
const isCreateCollectionOpen = ref(false);
const isCreateApiKeyOpen = ref(false);
const apiKeyVersion = ref(0);

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
    toasts.value.push({ id, message: formatErrorMessage(message), type });
    setTimeout(() => {
      toasts.value = toasts.value.filter(t => t.id !== id);
    }, 3500);
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
        let msg = json.error?.message;
        if (!msg) {
          if (res.status === 401) msg = '未授权：API 密钥无效或未提供';
          else if (res.status === 403) msg = '权限不足：当前角色无权执行此操作';
          else if (res.status === 404) msg = '请求的资源或集合不存在';
          else if (res.status === 500) msg = '服务器处理异常';
          else msg = `请求失败 (HTTP ${res.status})`;
        }
        msg = formatErrorMessage(msg);
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
      const verifyRes = await apiRequest('/api/auth/verify');
      isConnected.value = true;
      if (verifyRes && verifyRes.role) {
        currentRole.value = verifyRes.role;
        try {
          localStorage.setItem('litedb_user_role', verifyRes.role);
        } catch {}
      }
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
    currentRole,
    isAdmin,
    isWrite,
    isReadOnly,
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
    apiKeyVersion,
    triggerApiKeyRefresh: () => { apiKeyVersion.value++; },
    setEndpointAndKey,
    apiRequest,
    checkConnection,
    refreshStats,
    refreshCollections
  };
}
