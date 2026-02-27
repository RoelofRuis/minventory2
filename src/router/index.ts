import { createRouter, createWebHistory } from 'vue-router';
import Dashboard from '../components/Dashboard.vue';
import Login from '../components/Login.vue';
import TwoFactor from '../components/TwoFactor.vue';
import ItemCloud3D from '../components/ItemCloud3D.vue';
import { useAuthStore } from '../stores/auth';

const routes = [
  { path: '/', component: Dashboard, meta: { requiresAuth: true } },
  { path: '/login', component: Login },
  { path: '/logout', redirect: '/login' },
  { path: '/verify-2fa', component: TwoFactor, meta: { requiresAuth: true } },
  { path: '/cloud', component: ItemCloud3D, meta: { requiresAuth: true } }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore();
  
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    try {
      await authStore.checkAuth();
    } catch {}
    if (!authStore.isAuthenticated) {
      return next('/login');
    }
  }
  
  // If authenticated but 2FA is needed, redirect to /verify-2fa (unless already there)
  if (authStore.isAuthenticated && authStore.user && !authStore.user.is2FAVerified && to.path !== '/verify-2fa') {
    return next('/verify-2fa');
  }

  // If already authenticated (including 2FA), redirect away from login
  if (to.path === '/login' && authStore.isAuthenticated && authStore.user && authStore.user.is2FAVerified) {
    return next('/');
  }

  next();
});

export default router;
