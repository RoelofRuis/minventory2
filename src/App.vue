<template>
  <header class="app-header" v-if="!['/login', '/verify-2fa'].includes(route.path)">
    <div style="display: flex; align-items: center; justify-content: center; gap: 15px;">
      <h1 class="app-title">Minventory</h1>
      <router-link v-if="authStore.isAuthenticated" :to="viewToggleLink" class="icon-btn" :title="viewToggleTitle">
        <Rocket v-if="route.path !== '/cloud'" :size="28" />
        <Box v-else :size="28" />
      </router-link>
    </div>
    <div v-if="authStore.isAuthenticated" style="margin-top: 8px; display: flex; align-items: center; justify-content: center; gap: 10px;">
      <button class="btn-secondary btn-small" style="width: auto; white-space: nowrap;" @click="showSettingsModal = true">
        <Settings :size="16" style="vertical-align: middle; margin-right: 4px;" />
        Settings
      </button>
    </div>
  </header>
  <router-view></router-view>

  <!-- Settings Modal -->
  <div v-if="showSettingsModal" class="modal-overlay" @click.self="showSettingsModal = false">
    <div class="modal-content" style="max-width: 420px;">
      <X class="modal-close" :size="20" @click="showSettingsModal = false" />
      <h2 class="accent-text">Settings</h2>
      <div class="form-group" style="display:flex; align-items:center; justify-content: space-between; gap: 12px; margin-top: 12px;">
        <div>
          <label class="silver-text" style="font-weight: 600;">Private Items</label>
          <div class="silver-text" style="font-size: 12px;">{{ authStore.showPrivate ? 'Currently visible' : 'Currently hidden' }}</div>
        </div>
        <button class="btn-secondary btn-small" style="width: auto; white-space: nowrap;" @click="openPrivateFromSettings">
          <component :is="authStore.showPrivate ? EyeOff : Eye" :size="16" style="vertical-align: middle; margin-right: 4px;" />
          {{ authStore.showPrivate ? 'Hide Private' : 'Show Private' }}
        </button>
      </div>

      <div class="form-group" style="display:flex; align-items:center; justify-content: space-between; gap: 12px; margin-top: 12px;">
        <div>
          <label class="silver-text" style="font-weight: 600;">Edit Mode</label>
          <div class="silver-text" style="font-size: 12px;">{{ authStore.editMode ? 'Enabled (private visible)' : 'Disabled' }}</div>
        </div>
        <button class="btn-secondary btn-small" style="width: auto; white-space: nowrap;" @click="toggleEditModeFromSettings">
          <Settings :size="16" style="vertical-align: middle; margin-right: 4px;" />
          {{ authStore.editMode ? 'Disable Edit' : 'Enable Edit' }}
        </button>
      </div>

      <div class="form-group" style="display:flex; align-items:center; justify-content: space-between; gap: 12px; margin-top: 20px; border-top: 1px solid var(--border-color); padding-top: 12px;">
        <div>
          <label class="silver-text" style="font-weight: 600;">Grid Columns</label>
          <div class="silver-text" style="font-size: 12px;">Currently set to {{ authStore.gridColumns }}</div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <input 
            type="range" 
            :value="authStore.gridColumns" 
            @input="authStore.setGridColumns(Number(($event.target as HTMLInputElement).value))"
            min="1" 
            max="5" 
            step="1"
            style="margin-bottom: 0; width: 120px;"
          />
        </div>
      </div>

      <div class="form-group" style="margin-top: 20px; border-top: 1px solid var(--border-color); padding-top: 12px;">
        <div style="display:flex; align-items:center; justify-content: space-between; gap: 12px; margin-bottom: 8px;">
          <label class="silver-text" style="font-weight: 600;">Debug Logs</label>
          <div style="display: flex; gap: 8px;">
            <button v-if="showLogs && logs.length > 0" class="btn-secondary btn-small" style="width: auto; white-space: nowrap; padding: 4px 8px;" @click="clearLogs">
              <Trash2 :size="14" style="vertical-align: middle;" />
            </button>
            <button class="btn-secondary btn-small" style="width: auto; white-space: nowrap;" @click="showLogs = !showLogs">
              <Terminal :size="16" style="vertical-align: middle; margin-right: 4px;" />
              {{ showLogs ? 'Hide Logs' : 'Show Logs' }}
            </button>
          </div>
        </div>
        <div v-if="showLogs" class="log-container" style="max-height: 200px; overflow-y: auto; background: rgba(0,0,0,0.3); padding: 8px; border-radius: 4px; font-family: monospace; font-size: 10px;">
          <div v-if="logs.length === 0" class="silver-text">No logs captured yet.</div>
          <div v-for="(log, index) in logs" :key="index" :style="{ color: getLogColor(log.type), marginBottom: '4px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '2px' }">
            <span style="opacity: 0.5;">[{{ log.timestamp.toLocaleTimeString() }}]</span>
            <span style="font-weight: bold; margin: 0 4px;">{{ log.type.toUpperCase() }}:</span>
            <pre style="display: inline; white-space: pre-wrap; word-break: break-all; margin: 0; font-family: inherit;">{{ log.message }}</pre>
          </div>
        </div>
      </div>

      <div style="margin-top: 24px; border-top: 1px solid var(--border-color); padding-top: 16px;">
        <button @click="logout" class="btn-secondary btn-small" style="width: 100%;">
          <LogOut :size="16" style="vertical-align: middle; margin-right: 4px;" />
          Logout
        </button>
      </div>
    </div>
  </div>

  <!-- Unlock Private Modal -->
  <div v-if="showUnlockModal" class="modal-overlay" @click.self="showUnlockModal = false">
    <div class="modal-content" style="max-width: 400px;">
      <X class="modal-close" :size="20" @click="showUnlockModal = false" />
      <h2 class="accent-text">Unlock Private Items</h2>
      <p class="silver-text" style="margin-bottom: 20px;">Please enter your password to reveal hidden items.</p>
      <form @submit.prevent="confirmUnlock">
        <div class="form-group">
          <label>Password</label>
          <input v-model="unlockPassword" type="password" required ref="unlockPasswordInput" @input="unlockError = ''" />
        </div>
        <p v-if="unlockError" class="error-text">{{ unlockError }}</p>
        <div class="actions">
          <button type="submit" class="btn-primary" :disabled="saving">
            {{ saving ? 'Unlocking...' : 'Unlock' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, nextTick, watch, onUnmounted } from 'vue';
import { useAuthStore } from './stores/auth';
import { useRoute } from 'vue-router';
import { Rocket, Box, Eye, EyeOff, X, Settings, LogOut, Terminal, Trash2 } from 'lucide-vue-next';
import axios from 'axios';
import { logs, clearLogs } from './utils/logger';

const authStore = useAuthStore();
const route = useRoute();

const showSettingsModal = ref(false);
const showUnlockModal = ref(false);
const unlockPassword = ref('');
const unlockError = ref('');
const unlockPasswordInput = ref<HTMLInputElement | null>(null);
const saving = ref(false);
const pendingEnableEdit = ref(false);
const showLogs = ref(false);

const getLogColor = (type: string) => {
  switch (type) {
    case 'error': return '#ff4444';
    case 'warn': return '#ffbb33';
    case 'info': return '#33b5e5';
    case 'debug': return '#2ecc71';
    default: return '#ffffff';
  }
};

const logout = async () => {
  await authStore.logout();
};

const togglePrivateItems = async () => {
  if (!authStore.showPrivate) {
    unlockPassword.value = '';
    unlockError.value = '';
    showUnlockModal.value = true;
    nextTick(() => {
      unlockPasswordInput.value?.focus();
    });
  } else {
    authStore.togglePrivate(false);
  }
};

const openPrivateFromSettings = async () => {
  if (!authStore.showPrivate) {
    showSettingsModal.value = false;
    await nextTick();
  }
  togglePrivateItems();
};

const toggleEditModeFromSettings = async () => {
  if (!authStore.editMode) {
    // Enabling edit mode should also enable private view. Prompt unlock if needed.
    if (!authStore.showPrivate) {
      pendingEnableEdit.value = true;
      showSettingsModal.value = false;
      await nextTick();
      togglePrivateItems();
    } else {
      authStore.setEditMode(true);
    }
  } else {
    // Disabling edit also disables private
    authStore.setEditMode(false);
  }
};

const confirmUnlock = async () => {
  if (!unlockPassword.value) return;
  
  saving.value = true;
  unlockError.value = '';
  try {
    await axios.post('/api/auth/unlock-private', { password: unlockPassword.value });
    authStore.togglePrivate(true);
    if (pendingEnableEdit.value) {
      authStore.setEditMode(true);
      pendingEnableEdit.value = false;
    }
    showUnlockModal.value = false;
  } catch (err) {
    unlockError.value = 'Invalid password or failed to unlock';
  } finally {
    saving.value = false;
  }
};

const viewToggleLink = computed(() => route.path === '/cloud' ? '/' : '/cloud');
const viewToggleTitle = computed(() => route.path === '/cloud' ? 'Back to List' : '3D Cloud View');

watch([showSettingsModal, showUnlockModal], ([s1, s2]) => {
  if (s1 || s2) {
    document.body.classList.add('modal-open');
  } else {
    nextTick(() => {
      if (document.querySelectorAll('.modal-overlay').length === 0) {
        document.body.classList.remove('modal-open');
      }
    });
  }
});

onUnmounted(() => {
  nextTick(() => {
    if (document.querySelectorAll('.modal-overlay').length === 0) {
      document.body.classList.remove('modal-open');
    }
  });
});
</script>
