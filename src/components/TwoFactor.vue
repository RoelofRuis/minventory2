<template>
  <div class="auth-container">
    <div class="card" style="text-align: center;">
      <h2 class="app-title" style="margin-bottom: 20px; font-size: 1.5rem;">2FA Verification</h2>
      
      <p class="silver-text" style="margin-bottom: 30px;">Enter the 6-digit code from your Authenticator app.</p>
      
      <form @submit.prevent="verifyToken">
        <input 
          v-model="token" 
          type="text" 
          class="otp-input" 
          placeholder="000000" 
          maxlength="6" 
          pattern="\d{6}"
          required 
          autofocus
        />
        
        <p v-if="error" class="error-text">{{ error }}</p>
        
        <button type="submit" class="btn-primary" :disabled="loading || token.length !== 6">
          {{ loading ? 'Verifying...' : 'Verify' }}
        </button>
      </form>
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
const loading = ref(false);
const error = ref('');

const verifyToken = async () => {
  if (token.value.length !== 6) return;
  
  loading.value = true;
  error.value = '';
  try {
    await axios.post('/api/auth/verify-2fa', { token: token.value });
    await authStore.checkAuth();
    router.push('/').catch(() => {});
  } catch (err: any) {
    error.value = 'Invalid code. Try again.';
  } finally {
    loading.value = false;
  }
};
</script>
