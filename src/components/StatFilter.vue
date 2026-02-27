<template>
  <div class="stat-filter-container" ref="dropdownRef">
    <div class="stat-filter-input" @click="showDropdown = !showDropdown" :class="{ active: selectedValues.length > 0 }">
      <component :is="icon" :size="18" class="silver-text" style="flex-shrink: 0;" />
      <div v-if="selectedValues.length > 0" class="selection-indicator">
        {{ selectedValues.length }}
      </div>
      <ChevronDown :size="14" class="silver-text" />
    </div>
    <div v-if="showDropdown" class="dropdown-menu">
      <div class="dropdown-header">
        <span class="silver-text" style="font-size: 0.8rem; font-weight: bold;">{{ label }}</span>
        <button v-if="selectedValues.length > 0" type="button" class="btn-link" @click.stop="emit('update:selectedValues', [])">Clear</button>
      </div>
      <div v-for="option in options" :key="option" 
           class="dropdown-item" 
           :class="{ selected: selectedValues.includes(option) }"
           @click="toggleOption(option)">
        <span style="flex: 1;">{{ formatStat(option) }}</span>
        <Check v-if="selectedValues.includes(option)" :size="16" class="accent-text" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { ChevronDown, Check } from 'lucide-vue-next';
import { formatStat } from '../utils/formatters';

const props = defineProps<{
  selectedValues: string[];
  options: string[];
  icon: any;
  label: string;
}>();

const emit = defineEmits<{
  (e: 'update:selectedValues', values: string[]): void;
}>();

const showDropdown = ref(false);
const dropdownRef = ref<HTMLElement | null>(null);

const toggleOption = (option: string) => {
  const newValues = [...props.selectedValues];
  const idx = newValues.indexOf(option);
  if (idx > -1) {
    newValues.splice(idx, 1);
  } else {
    newValues.push(option);
  }
  emit('update:selectedValues', newValues);
};

const handleClickOutside = (event: MouseEvent) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    showDropdown.value = false;
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
.stat-filter-container {
  position: relative;
  display: inline-block;
}

.stat-filter-input {
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--input-bg);
  border: 1px solid var(--border-color);
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 40px;
  justify-content: center;
}

.stat-filter-input:hover {
  border-color: var(--accent-purple);
}

.stat-filter-input.active {
  border-color: var(--accent-purple);
  background: rgba(157, 80, 187, 0.1);
}

.selection-indicator {
  background: var(--accent-purple);
  color: white;
  font-size: 0.7rem;
  font-weight: bold;
  min-width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 1000;
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  margin-top: 8px;
  min-width: 150px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.5);
  max-height: 300px;
  overflow-y: auto;
}

.dropdown-header {
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dropdown-item {
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background 0.2s ease;
}

.dropdown-item:hover {
  background: rgba(255,255,255,0.05);
}

.dropdown-item.selected {
  color: var(--accent-purple);
  background: rgba(157, 80, 187, 0.05);
}

.btn-link {
  background: none;
  border: none;
  color: var(--accent-purple);
  font-size: 0.75rem;
  padding: 0;
  cursor: pointer;
}

.btn-link:hover {
  text-decoration: underline;
}
</style>
