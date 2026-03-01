import { createRouter, createWebHistory } from 'vue-router';
import Dashboard from '../components/Dashboard.vue';
import Login from '../components/Login.vue';
import TwoFactor from '../components/TwoFactor.vue';
import ItemCloud3D from '../components/ItemCloud3D.vue';
import ArtisticQuestions from '../components/ArtisticQuestions.vue';
import { useAuthStore } from '../stores/auth';

const routes = [
  { path: '/', component: Dashboard, meta: { requiresAuth: true } },
  { path: '/login', component: Login },
  { path: '/logout', redirect: '/login' },
  { path: '/verify-2fa', component: TwoFactor, meta: { requiresAuth: true } },
  { path: '/cloud', component: ItemCloud3D, meta: { requiresAuth: true } },
  { path: '/artistic', component: ArtisticQuestions, meta: { requiresAuth: true } }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach(async (to) => {
  const { isAuthenticated, is2FAVerified, checkAuth } = useAuthStore();

  if (to.meta.requiresAuth && !isAuthenticated.value) {
    try {
      await checkAuth();
    } catch {}
    if (!isAuthenticated.value && to.path !== '/login') {
      return { path: '/login', replace: true };
    }
  }

  // If authenticated but 2FA is needed, redirect to /verify-2fa (unless already there)
  if (isAuthenticated.value && !is2FAVerified.value && to.path !== '/verify-2fa') {
    return { path: '/verify-2fa', replace: true };
  }

  // If already authenticated (including 2FA), redirect away from login
  if (to.path === '/login' && isAuthenticated.value && is2FAVerified.value) {
    return { path: '/', replace: true };
  }

  return true;
});

export default router;
