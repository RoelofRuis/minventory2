import { ref, computed, watch } from 'vue';
import axios from 'axios';
import { useAuthStore } from './auth';
import { useCategoryStore } from './category';
import {filter} from "./filter.ts";

const imageUrlCache = new Map<string, string>();

const items = ref<any[]>([]);
const loading = ref(false);

export function useItemStore() {
  const {showPrivate} = useAuthStore();

  const { categories } = useCategoryStore();
  const {
    selectedCategoryIds,
    mode: filterMode,
    selectedJoys,
    selectedFrequencies,
    selectedIntentions,
    selectedAttachments,
    searchQuery
  } = filter();


  const fetchItems = async (force = false) => {
    if (items.value.length > 0 && !force) return;
    loading.value = true;
    try {
      // Clear old object URLs to avoid memory leaks
      items.value.forEach((item: any) => {
        if (item.image && typeof item.image === 'string' && item.image.startsWith('blob:')) {
          try { URL.revokeObjectURL(item.image); } catch (e) {}
        }
      });

      const res = await axios.get('/api/items');
      items.value = res.data;

      // Load thumbnails asynchronously
      await Promise.all(items.value.map(async (item: any) => {
        const targetUrl = item.thumbUrl || item.imageUrl;
        if (targetUrl) {
          const objUrl = await fetchObjectUrl(targetUrl);
          if (objUrl) item.image = objUrl;
        }
      }));

      // When private mode is off, proactively remove private items from memory
      if (!showPrivate) {
        items.value = items.value.filter((i: any) => !i.private);
      }
    } catch (err) {
      console.error('Failed to fetch items', err);
    } finally {
      loading.value = false;
    }
  };

  const fetchObjectUrl = async (url: string) => {
    if (imageUrlCache.has(url)) return imageUrlCache.get(url)!;
    try {
      const res = await axios.get(url, { 
        responseType: 'blob' 
      });
      const objectUrl = URL.createObjectURL(res.data);
      imageUrlCache.set(url, objectUrl);
      return objectUrl;
    } catch (err) {
      return null;
    }
  };

  watch(() => showPrivate, (val) => {
    if (!val) {
      // Clear all object URLs to be safe when hiding private items
      imageUrlCache.forEach((objUrl) => {
        try { URL.revokeObjectURL(objUrl); } catch {}
      });
      imageUrlCache.clear();
      
      const toRemove = items.value.filter((i: any) => i.private);
      // Also drop any object URLs attached to items themselves if they weren't in the cache
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
    
    if (!showPrivate) {
      result = result.filter(i => !i.private);
    }
    
    const sel = Array.isArray(selectedCategoryIds.value) ? selectedCategoryIds.value : [];
    if (sel.length > 0) {
      const includesUnset = sel.includes('__unset__');
      if (filterMode.value === 'or') {
        const allDescendantIds = new Set<string>();
        sel.forEach(id => {
          if (id !== '__unset__') {
            getDescendantIds(id).forEach(dId => allDescendantIds.add(dId));
          }
        });
        result = result.filter(item => {
          const hasSelectedCat = item.categoryIds && item.categoryIds.some((catId: string) => allDescendantIds.has(catId));
          const isUnset = !item.categoryIds || item.categoryIds.length === 0;
          return (includesUnset && isUnset) || hasSelectedCat;
        });
      } else {
        result = result.filter(item => {
          return sel.every(selectedId => {
            if (selectedId === '__unset__') {
              return !item.categoryIds || item.categoryIds.length === 0;
            }
            if (!item.categoryIds) return false;
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

    if (selectedJoys.value.length > 0) {
      result = result.filter(i => selectedJoys.value.includes(i.joy || 'undefined'));
    }

    if (selectedFrequencies.value.length > 0) {
      result = result.filter(i => selectedFrequencies.value.includes(i.usageFrequency || 'undefined'));
    }

    if (selectedIntentions.value.length > 0) {
      result = result.filter(i => selectedIntentions.value.includes(i.intention || 'undecided'));
    }

    if (selectedAttachments.value.length > 0) {
      result = result.filter(i => selectedAttachments.value.includes(i.attachment || 'undefined'));
    }
    
    return [...result].sort((a, b) => a.name.localeCompare(b.name));
  });

  const totalIndividualItems = computed(() => {
    return filteredItems.value.reduce((sum, item) => sum + (item.quantity || 0), 0);
  });

  return {
    items,
    loading,
    fetchItems,
    fetchObjectUrl,
    filteredItems,
    totalIndividualItems,
    getDescendantIds
  };
}
