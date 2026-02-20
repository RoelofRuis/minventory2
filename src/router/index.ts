import { createRouter, createWebHistory } from 'vue-router';
import Dashboard from '../components/Dashboard.vue';
import Login from '../components/Login.vue';
import TwoFactor from '../components/TwoFactor.vue';
import ItemCloud3D from '../components/ItemCloud3D.vue';
import { useAuthStore } from '../stores/auth';

const routes = [
  { path: '/', component: Dashboard, meta: { requiresAuth: true } },
  { path: '/login', component: Login },
  { path: '/verify-2fa', component: TwoFactor, meta: { requiresAuth: true } },
  { path: '/cloud', component: ItemCloud3D, meta: { requiresAuth: true } }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore();
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/login');
  } else {
    next();
  }
});

export default router;
