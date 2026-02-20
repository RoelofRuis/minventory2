<template>
  <div class="container">
    <div class="card">
      <h2 class="app-title" style="margin-bottom: 20px; font-size: 1.5rem;">2FA Verification</h2>
      
      <div v-if="!qrCode && !setupMode">
        <p class="silver-text">Enter the code from your Authenticator app.</p>
        <form @submit.prevent="verifyToken">
          <input v-model="token" type="text" placeholder="6-digit code" required />
          <p v-if="error" class="error-text">{{ error }}</p>
          <button type="submit" class="btn-primary" :disabled="loading">Verify</button>
        </form>
        <div style="margin-top: 20px;">
          <button @click="setup2FA" class="btn-secondary" style="width: 100%;">Setup 2FA</button>
        </div>
      </div>

      <div v-if="qrCode">
        <p class="silver-text">Scan this QR code with Google Authenticator:</p>
        <div style="text-align: center; margin: 20px 0; background: #f1f5f9; padding: 12px; border-radius: 12px; display: inline-block;">
          <img :src="qrCode" style="max-width: 200px; display: block;" />
        </div>
        <p class="silver-text">Then enter the code below:</p>
        <form @submit.prevent="verifyToken">
          <input v-model="token" type="text" placeholder="6-digit code" required />
          <p v-if="error" class="error-text">{{ error }}</p>
          <button type="submit" class="btn-primary" :disabled="loading">Complete Setup</button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import axios from 'axios';
import { useAuthStore } from '../stores/auth';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();

const token = ref('');
const qrCode = ref('');
const loading = ref(false);
const error = ref('');
const setupMode = ref(false);

const setup2FA = async () => {
  try {
    const res = await axios.post('/api/auth/setup-2fa', {}, {
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    });
    qrCode.value = res.data.qrCode;
    setupMode.value = true;
  } catch (err: any) {
    error.value = 'Failed to start 2FA setup';
  }
};

const verifyToken = async () => {
  loading.value = true;
  error.value = '';
  try {
    const res = await axios.post('/api/auth/verify-2fa', { token: token.value }, {
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    });
    authStore.setToken(res.data.token);
    router.push('/');
  } catch (err: any) {
    error.value = 'Invalid code. Try again.';
  } finally {
    loading.value = false;
  }
};
</script>
