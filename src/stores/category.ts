import { defineStore } from 'pinia';
import { ref } from 'vue';
import axios from 'axios';

export const useCategoryStore = defineStore('category', () => {
  const categories = ref<any[]>([]);
  const loading = ref(false);

  const fetchCategories = async (force = false) => {
    if (categories.value.length > 0 && !force) return;
    loading.value = true;
    try {
      const res = await axios.get('/api/categories');
      categories.value = res.data.sort((a: any, b: any) => a.name.localeCompare(b.name));
    } catch (err) {
      console.error('Failed to fetch categories', err);
    } finally {
      loading.value = false;
    }
  };

  const getCategoryName = (id: string) => categories.value.find(c => c.id === id)?.name || 'Unknown';
  const getCategoryColor = (id: string) => categories.value.find(c => c.id === id)?.color || 'var(--accent-purple)';

  return {
    categories,
    loading,
    fetchCategories,
    getCategoryName,
    getCategoryColor
  };
});
