<script setup lang="ts">
import { Smile, Zap, Target, Heart, X } from 'lucide-vue-next';
import CategoryFilter from './CategoryFilter.vue';
import StatFilter from './StatFilter.vue';
import { usageFrequencies, attachments, intentions, joys } from '../utils/constants';
import {useFilters} from "../composables/useFilters.ts";

defineProps<{
  categories: any[];
  totalItems: number;
}>();

const {
  selectedCategoryIds,
  mode: filterMode,
  selectedJoys,
  selectedFrequencies,
  selectedIntentions,
  selectedAttachments,
  searchQuery
} = useFilters();
</script>


<template>
  <div class="card filter-bar-card">
    <div class="quantity-badge total-count-badge" :title="`${totalItems} total ${totalItems === 1 ? 'item' : 'items'}`">
      {{ totalItems }}
    </div>
    <div class="filter-bar">
      <div class="search-wrapper">
        <input v-model="searchQuery" type="text" placeholder="Search items..." />
        <button v-if="searchQuery" class="clear-button" @click="searchQuery = ''" title="Clear search">
          <X :size="16" />
        </button>
      </div>
      
      <CategoryFilter 
        v-model:selectedIds="selectedCategoryIds" 
        v-model:mode="filterMode" 
        :categories="categories" 
        style="flex: 2;"
      />

      <div class="stat-filters">
        <StatFilter 
          v-model:selectedValues="selectedJoys" 
          :options="joys" 
          :icon="Smile" 
          label="Joy" 
        />
        <StatFilter 
          v-model:selectedValues="selectedFrequencies" 
          :options="usageFrequencies" 
          :icon="Zap" 
          label="Usage" 
        />
        <StatFilter 
          v-model:selectedValues="selectedIntentions" 
          :options="intentions" 
          :icon="Target" 
          label="Intention" 
        />
        <StatFilter 
          v-model:selectedValues="selectedAttachments" 
          :options="attachments" 
          :icon="Heart" 
          label="Attachment" 
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.filter-bar-card {
  margin-bottom: 16px;
  position: relative;
  padding: 12px 16px;
}

.total-count-badge {
  border-top-right-radius: 12px;
}

.filter-bar {
  margin-bottom: 0;
}

@media (max-width: 600px) {
  .filter-bar-card {
    margin-bottom: 12px;
    padding: 12px;
  }
}
</style>
