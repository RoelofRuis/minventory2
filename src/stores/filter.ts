import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

export type FilterMode = 'and' | 'or';

function loadIds(): string[] {
  try {
    const raw = localStorage.getItem('filter:selectedCategoryIds');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function loadMode(): FilterMode {
  const raw = localStorage.getItem('filter:mode');
  return raw === 'and' || raw === 'or' ? raw : 'or';
}

export const useFilterStore = defineStore('filter', () => {
  const selectedCategoryIds = ref<string[]>(loadIds());
  const mode = ref<FilterMode>(loadMode());

  // Persist to localStorage whenever values change
  watch(
    selectedCategoryIds,
    (ids) => {
      try {
        localStorage.setItem('filter:selectedCategoryIds', JSON.stringify(ids));
      } catch {}
    },
    { deep: true }
  );

  watch(mode, (m) => {
    try {
      localStorage.setItem('filter:mode', m);
    } catch {}
  });

  const setSelectedCategoryIds = (ids: string[]) => {
    selectedCategoryIds.value = [...ids];
  };

  const clear = () => {
    selectedCategoryIds.value = [];
  };

  const setMode = (m: FilterMode) => {
    mode.value = m;
  };

  return {
    selectedCategoryIds,
    mode,
    setSelectedCategoryIds,
    setMode,
    clear,
  };
});
