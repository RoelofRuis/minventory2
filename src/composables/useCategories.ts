import { ref } from 'vue';
import axios from 'axios';

export function useCategories() {
  const categories = ref<any[]>([]);

  const fetchCategories = async () => {
    try {
      const res = await axios.get('/api/categories', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      categories.value = res.data;
    } catch (err) {
      console.error('Failed to fetch categories', err);
    }
  };

  const getCategoryName = (id: string) => categories.value.find(c => c.id === id)?.name || 'Unknown';
  const getCategoryColor = (id: string) => categories.value.find(c => c.id === id)?.color || 'var(--accent-purple)';

  return {
    categories,
    fetchCategories,
    getCategoryName,
    getCategoryColor
  };
}
