<template>
  <div class="auth-container">
    <div class="card">
      <h2 class="app-title" style="margin-bottom: 20px; font-size: 1.5rem;">Login</h2>
      
      <form @submit.prevent="handleSubmit">
        <input v-model="username" type="text" placeholder="Username" required />
        <input v-model="password" type="password" placeholder="Password" required />
        
        <p v-if="error" class="error-text">{{ error }}</p>
        
        <button type="submit" class="btn-primary" :disabled="loading">
          {{ loading ? 'Processing...' : 'Login' }}
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

const username = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');

const authStore = useAuthStore();
const router = useRouter();

const handleSubmit = async () => {
  loading.value = true;
  error.value = '';
  try {
    const res = await axios.post('/api/auth/login', { username: username.value, password: password.value });
    
    // Reset settings.ts for the new user session
    localStorage.clear();
    authStore.editMode.value = false;
    authStore.showPrivate.value = false;

    await authStore.checkAuth();
    
    if (res.data.requires2FA) {
      router.push('/verify-2fa').catch(() => {});
    } else {
      router.push('/').catch(() => {});
    }
  } catch (err: any) {
    error.value = err.response?.data?.error || 'An error occurred';
  } finally {
    loading.value = false;
  }
};
</script>
