<script setup lang="ts">
import {Lock, Package, Target, X} from "lucide-vue-next";
import {computed, ref} from "vue";
import {useCategoryStore} from "../../stores/category.ts";
import {useAuthStore} from "../../stores/auth.ts";

defineEmits<{
  (e: 'category-selected', category: any): void;
}>()

const { editMode } = useAuthStore();

const {categories, visibleCategories} = useCategoryStore();

const categorySearch = ref('');

const filteredCategories = computed(() => {
  const q = categorySearch.value.trim().toLowerCase();
  const base = [...visibleCategories.value] as any[];
  const results = q ? base.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.description || '').toLowerCase().includes(q)
  ) : base;

  return results.sort((a, b) => a.name.localeCompare(b.name));
});
</script>

<template>
  <div class="card filter-bar">
    <div class="search-wrapper" style="flex: 1;">
      <input v-model="categorySearch" type="text" placeholder="Search categories..."/>
      <button v-if="categorySearch" class="clear-button" @click="categorySearch = ''" title="Clear search">
        <X :size="16"/>
      </button>
    </div>
  </div>

  <div v-if="categories.length === 0" class="silver-text">No categories created yet.</div>
  <div v-else-if="filteredCategories.length === 0" class="silver-text">No categories found.</div>

  <div class="grid" v-else>
    <div v-for="cat in filteredCategories" :key="cat.id" class="item-card"
         @click="$emit('category-selected', cat)"
         :style="{ borderColor: cat.color || 'var(--border-color)', cursor: editMode ? 'pointer' : 'default' }">
      <h3 :style="{ color: cat.color || 'var(--accent-purple)', margin: '0 0 8px 0' }">
        <Lock v-if="cat.isPrivate" :size="14" :color="cat.private ? '#ef4444' : '#f59e0b'"
              style="margin-right: 6px; vertical-align: middle;" title="Private"/>
        {{ cat.name }}
      </h3>
      <p class="silver-text" style="font-size: 0.9rem; margin-bottom: 8px;">{{
          cat.description || 'No description'
        }}</p>
      <div class="item-stats-row" style="margin-top: auto;">
        <div class="item-stat" :title="'Items: ' + cat.count">
          <Package :size="14"/>
          <span>{{ cat.count }}</span>
        </div>
        <div v-if="cat.intentionalCount" class="item-stat" :title="'Target: ' + cat.intentionalCount">
          <Target :size="14"/>
          <span>{{ cat.intentionalCount }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>

</style>