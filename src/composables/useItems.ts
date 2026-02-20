import { ref, computed, watch } from 'vue';
import axios from 'axios';
import { useAuthStore } from '../stores/auth';

export function useItems(categories: any) {
  const authStore = useAuthStore();
  const items = ref<any[]>([]);
  const loading = ref(false);
  const selectedCategoryIds = ref<string[]>([]);
  const filterMode = ref<'and' | 'or'>('or');
  const searchQuery = ref('');

  const fetchItems = async () => {
    loading.value = true;
    try {
      const res = await axios.get('/api/items', {
        headers: { Authorization: `Bearer ${authStore.token}` }
      });
      items.value = res.data;

      // Load thumbnails asynchronously
      items.value.forEach(async (item) => {
        const targetUrl = item.thumbUrl || item.imageUrl;
        if (targetUrl) {
          const objUrl = await fetchObjectUrl(targetUrl);
          if (objUrl) item.image = objUrl;
        }
      });

      // When private mode is off, proactively remove private items from memory
      if (!authStore.showPrivate) {
        items.value = items.value.filter((i: any) => !i.private);
      }
    } catch (err) {
      console.error('Failed to fetch items', err);
    } finally {
      loading.value = false;
    }
  };

  const fetchObjectUrl = async (url: string) => {
    try {
      const res = await axios.get(url, { 
        headers: { Authorization: `Bearer ${authStore.token}` },
        responseType: 'blob' 
      });
      return URL.createObjectURL(res.data);
    } catch (err) {
      return null;
    }
  };

  // Ensure private items are purged from client arrays when private mode is disabled
  watch(() => authStore.showPrivate, (val) => {
    if (!val) {
      const toRemove = items.value.filter((i: any) => i.private);
      // Best-effort: drop any object URLs we created for removed items
      for (const it of toRemove) {
        if (typeof it.image === 'string' && it.image.startsWith('blob:')) {
          try { URL.revokeObjectURL(it.image); } catch {}
        }
      }
      items.value = items.value.filter((i: any) => !i.private);
    }
  });

  const getDescendantIds = (parentId: string): string[] => {
    const descendants: string[] = [parentId];
    const findChildren = (pid: string) => {
      const children = categories.value.filter((c: any) => c.parentId === pid);
      for (const child of children) {
        descendants.push(child.id);
        findChildren(child.id);
      }
    };
    findChildren(parentId);
    return descendants;
  };

  const filteredItems = computed(() => {
    let result = items.value;
    
    if (!authStore.showPrivate) {
      result = result.filter(i => !i.private);
    }
    
    if (selectedCategoryIds.value.length > 0) {
      if (filterMode.value === 'or') {
        const allDescendantIds = new Set<string>();
        selectedCategoryIds.value.forEach(id => {
          getDescendantIds(id).forEach(dId => allDescendantIds.add(dId));
        });
        result = result.filter(item => 
          item.categoryIds && item.categoryIds.some((catId: string) => allDescendantIds.has(catId))
        );
      } else {
        result = result.filter(item => {
          if (!item.categoryIds) return false;
          return selectedCategoryIds.value.every(selectedId => {
            const descendants = getDescendantIds(selectedId);
            return item.categoryIds.some((catId: string) => descendants.includes(catId));
          });
        });
      }
    }
    
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase();
      result = result.filter(i => i.name.toLowerCase().includes(q));
    }
    
    return result;
  });

  const totalIndividualItems = computed(() => {
    return filteredItems.value.reduce((sum, item) => sum + (item.quantity || 0), 0);
  });

  return {
    items,
    loading,
    selectedCategoryIds,
    filterMode,
    searchQuery,
    fetchItems,
    filteredItems,
    totalIndividualItems,
    getDescendantIds
  };
}
