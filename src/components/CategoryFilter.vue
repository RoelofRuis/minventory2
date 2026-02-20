<template>
  <div class="multiselect-container" ref="dropdownRef">
    <div class="multiselect-input" @click="focusCategorySearch">
      <Tag :size="18" class="silver-text" style="margin-right: 4px; flex-shrink: 0;" />
      <div class="multiselect-badges-wrapper">
        <div v-for="catId in selectedIds" :key="catId" class="multiselect-badge">
          {{ getCategoryName(catId) }}
          <X :size="14" @click.stop="toggleFilterCategory(catId)" />
        </div>
        <input 
          v-model="categorySearchQuery" 
          ref="categorySearchInput"
          :placeholder="selectedIds.length === 0 ? 'Filter categories...' : ''" 
          @focus="showCategoryDropdown = true"
        />
      </div>
      <div v-if="selectedIds.length > 1" class="mode-toggle" @click.stop="toggleMode" :title="'Current mode: ' + (mode === 'or' ? 'At least one' : 'All selected')">
        {{ mode.toUpperCase() }}
      </div>
    </div>
    <div v-if="showCategoryDropdown" class="dropdown-menu">
      <div class="dropdown-actions">
         <span class="silver-text" style="font-size: 0.8rem;">
           {{ filteredSearchCategories.length }} categories
         </span>
         <button v-if="selectedIds.length > 0" type="button" class="btn-link" @click="emit('update:selectedIds', [])">Clear all</button>
      </div>
      <div v-for="cat in filteredSearchCategories" :key="cat.id" 
           class="dropdown-item" 
           :class="{ selected: selectedIds.includes(cat.id) }"
           :style="{ paddingLeft: (cat.level * 20 + 16) + 'px' }"
           @click="toggleFilterCategory(cat.id)">
        <span style="flex: 1;">{{ cat.name }}</span>
        <Check v-if="selectedIds.includes(cat.id)" :size="16" class="accent-text" />
      </div>
      <div v-if="filteredSearchCategories.length === 0" class="dropdown-item silver-text">No categories found</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue';
import { Tag, X, Check } from 'lucide-vue-next';

const props = defineProps<{
  selectedIds: string[];
  mode: 'and' | 'or';
  categories: any[];
}>();

const emit = defineEmits<{
  (e: 'update:selectedIds', ids: string[]): void;
  (e: 'update:mode', mode: 'and' | 'or'): void;
}>();

const categorySearchQuery = ref('');
const showCategoryDropdown = ref(false);
const dropdownRef = ref<HTMLElement | null>(null);
const categorySearchInput = ref<HTMLInputElement | null>(null);

const getCategoryName = (id: string) => props.categories.find(c => c.id === id)?.name || 'Unknown';

const sortedCategories = computed(() => {
  const cats = props.categories;
  const result: any[] = [];
  const addChildren = (parentId: string | null, level: number) => {
    const children = cats
      .filter(c => (c.parentId || null) === parentId)
      .sort((a, b) => a.name.localeCompare(b.name));
    
    for (const child of children) {
      result.push({ ...child, level });
      addChildren(child.id, level + 1);
    }
  };
  addChildren(null, 0);
  const addedIds = new Set(result.map(c => c.id));
  const missed = cats.filter(c => !addedIds.has(c.id));
  for (const cat of missed) {
    result.push({ ...cat, level: 0 });
  }
  return result;
});

const filteredSearchCategories = computed(() => {
  if (!categorySearchQuery.value) return sortedCategories.value;
  const q = categorySearchQuery.value.toLowerCase();
  return sortedCategories.value.filter(cat => 
    cat.name.toLowerCase().includes(q)
  );
});

const toggleFilterCategory = (catId: string) => {
  const newIds = [...props.selectedIds];
  const idx = newIds.indexOf(catId);
  if (idx > -1) {
    newIds.splice(idx, 1);
  } else {
    newIds.push(catId);
    categorySearchQuery.value = '';
  }
  emit('update:selectedIds', newIds);
};

const focusCategorySearch = () => {
  showCategoryDropdown.value = true;
  nextTick(() => {
    categorySearchInput.value?.focus();
  });
};

const toggleMode = () => {
  emit('update:mode', props.mode === 'or' ? 'and' : 'or');
};

const handleClickOutside = (event: MouseEvent) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    showCategoryDropdown.value = false;
  }
};

onMounted(() => {
  window.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  window.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.multiselect-badges-wrapper {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  flex: 1;
  max-height: 80px;
  overflow-y: auto;
}

.mode-toggle {
  background: var(--accent-purple);
  color: white;
  font-size: 0.7rem;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 4px;
  cursor: pointer;
  user-select: none;
  margin-left: 8px;
  flex-shrink: 0;
}

.mode-toggle:hover {
  filter: brightness(1.2);
}

.multiselect-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--input-bg);
  color: var(--accent-silver);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.85rem;
  border: 1px solid var(--border-color);
  white-space: nowrap;
}
</style>
