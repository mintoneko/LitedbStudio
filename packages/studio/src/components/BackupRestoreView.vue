<template>
  <div class="backup-restore-view">
    <div class="grid-2-cols">
      <!-- Export Card -->
      <div class="content-card">
        <div class="card-header">
          <h3>全量数据导出备份</h3>
          <p class="text-muted text-xs">将所有集合定义与文档导出为标准 JSON 快照</p>
        </div>
        <div class="card-body">
          <button class="btn btn-primary" :disabled="downloading" @click="downloadBackup">
            <Download :size="16" />
            <span>{{ downloading ? '正在导出...' : '下载 JSON 备份快照' }}</span>
          </button>
        </div>
      </div>

      <!-- Import Card -->
      <div class="content-card">
        <div class="card-header">
          <h3>全量数据导入恢复</h3>
          <p class="text-muted text-xs">通过 JSON 快照文件还原集合与记录</p>
        </div>
        <div class="card-body">
          <input
            ref="fileInput"
            type="file"
            accept=".json"
            style="display: none;"
            @change="handleFileChange"
          />
          <button class="btn btn-secondary" :disabled="importing" @click="triggerFileInput">
            <Upload :size="16" />
            <span>{{ importing ? '正在导入...' : '选择 JSON 文件导入' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { Download, Upload } from 'lucide-vue-next';
import { useLiteDB } from '../composables/useLiteDB.js';

const { apiRequest, refreshCollections, refreshStats, showToast, showConfirm } = useLiteDB();

const fileInput = ref(null);
const downloading = ref(false);
const importing = ref(false);

const downloadBackup = async () => {
  downloading.value = true;
  try {
    const snapshot = await apiRequest('/api/system/export');
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `litedb-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    showToast('备份快照下载完成!', 'success');
  } catch (err) {
    showToast(`导出失败: ${err.message}`, 'error');
  } finally {
    downloading.value = false;
  }
};

const triggerFileInput = () => {
  fileInput.value?.click();
};

const handleFileChange = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (evt) => {
    try {
      const json = JSON.parse(evt.target.result);
      await executeImport(json);
    } catch (err) {
      showToast(`解析文件失败: ${err.message}`, 'error');
    } finally {
      if (fileInput.value) fileInput.value.value = '';
    }
  };
  reader.readAsText(file);
};

const executeImport = async (snapshot) => {
  const confirmed = await showConfirm({
    title: '导入数据快照',
    message: '确定要导入该 JSON 快照吗？导入将恢复快照中包含的集合与文档记录。',
    confirmText: '确认导入',
    cancelText: '取消',
    type: 'warning'
  });
  if (!confirmed) return;

  importing.value = true;
  try {
    await apiRequest('/api/system/import', {
      method: 'POST',
      body: snapshot
    });
    showToast('数据恢复成功！', 'success');
    await refreshCollections();
    await refreshStats();
  } catch (err) {
    showToast(`导入失败: ${err.message}`, 'error');
  } finally {
    importing.value = false;
  }
};
</script>

<style scoped>
.grid-2-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

@media (max-width: 900px) {
  .grid-2-cols {
    grid-template-columns: 1fr;
  }
}
</style>
