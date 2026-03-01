<script setup lang="ts">

import {formatStat, getStatColor, isDefined} from "../../utils/formatters.ts";
import FilterBar from "../FilterBar.vue";
import {Gift, Heart, Lock, Package, Smile, Target, Users, Zap} from "lucide-vue-next";
import {useFilters} from "../../stores/filter.ts";
import {useItemStore} from "../../stores/item.ts";
import {useCategoryStore} from "../../stores/category.ts";

defineEmits<{
  (e: 'item-selected', itemId: any): void;
}>()

const {toggleSelectedCategoryId} = useFilters();

const {
  items,
  loading,
  filteredItems,
  totalIndividualItems
} = useItemStore();

const {
  visibleCategories,
  getCategoryColor,
  getCategoryName,
} = useCategoryStore();
</script>

<template>
  <FilterBar :categories="visibleCategories" :totalItems="totalIndividualItems"/>

  <div v-if="loading && items.length === 0" class="silver-text">Loading items...</div>
  <div v-else-if="filteredItems.length === 0" class="silver-text">No items found.</div>

  <div class="grid">
    <div v-for="item in filteredItems" :key="item.id" class="item-card">
      <div @click="$emit('item-selected', item.id)" style="cursor: pointer;">
        <div class="item-image-wrapper">
          <div class="quantity-badge" :title="'Quantity: ' + item.quantity">{{ item.quantity }}</div>
          <img v-if="item.image" :src="item.image"/>
          <div v-else style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
            <Package :size="32" :stroke-width="1.5" class="silver-text" style="opacity: 0.8;"/>
          </div>
          <h3 class="item-title-overlay">
            <Lock v-if="item.private" :size="12" color="#f59e0b" style="margin-right: 4px; vertical-align: middle;"
                  title="Private"/>
            <Users v-if="item.isBorrowed" :size="12" color="#f59e0b" style="margin-right: 4px; vertical-align: middle;"
                   title="Borrowed"/>
            <Gift v-if="item.isGifted" :size="12" color="#f59e0b" style="margin-right: 4px; vertical-align: middle;"
                  title="Gifted"/>
            {{ item.name }}
          </h3>
        </div>

        <div class="item-stats-row"
             v-if="isDefined(item.joy) || isDefined(item.usageFrequency) || isDefined(item.intention) || isDefined(item.attachment)">
          <div v-if="isDefined(item.joy)" class="item-stat" :title="'Joy: ' + formatStat(item.joy)">
            <Smile :size="14" :style="{ color: getStatColor(item.joy || 'medium') }"/>
            <span class="stat-text">{{ formatStat(item.joy) }}</span>
          </div>
          <div v-if="isDefined(item.usageFrequency)" class="item-stat"
               :title="'Usage: ' + formatStat(item.usageFrequency)">
            <Zap :size="14" :style="{ color: getStatColor(item.usageFrequency || 'undefined') }"/>
            <span class="stat-text">{{ formatStat(item.usageFrequency) }}</span>
          </div>
          <div v-if="isDefined(item.intention)" class="item-stat" :title="'Intention: ' + formatStat(item.intention)">
            <Target :size="14" :style="{ color: getStatColor(item.intention || 'undecided') }"/>
            <span class="stat-text">{{ formatStat(item.intention) }}</span>
          </div>
          <div v-if="isDefined(item.attachment)" class="item-stat"
               :title="'Attachment: ' + formatStat(item.attachment)">
            <Heart :size="14" :style="{ color: getStatColor(item.attachment || 'undefined') }"/>
            <span class="stat-text">{{ formatStat(item.attachment) }}</span>
          </div>
        </div>

        <div v-if="item.categoryIds && item.categoryIds.length > 0">
              <span v-for="catId in item.categoryIds" :key="catId" class="item-badge"
                    :style="{ backgroundColor: getCategoryColor(catId) + '11', color: getCategoryColor(catId), cursor: 'pointer' }"
                    @click.stop="toggleSelectedCategoryId(catId)">
                {{ getCategoryName(catId) }}
              </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>

</style>