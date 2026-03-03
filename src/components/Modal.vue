<script setup lang="ts">
import { watch, onUnmounted, nextTick } from 'vue';
import { X } from 'lucide-vue-next';

const props = defineProps<{
  show: boolean;
  title?: string;
  contentStyle?: any;
}>();

defineEmits(['close']);

const handleModalOpenClass = (show: boolean) => {
  if (show) {
    document.body.classList.add('modal-open');
  } else {
    // Wait for the modal to be removed from the DOM
    nextTick(() => {
      if (document.querySelectorAll('.modal-overlay').length === 0) {
        document.body.classList.remove('modal-open');
      }
    });
  }
};

watch(() => props.show, (newShow) => {
  handleModalOpenClass(newShow);
}, { immediate: true });

onUnmounted(() => {
  // Always try to cleanup when the component itself is destroyed
  handleModalOpenClass(false);
});
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
      <div class="modal-content" :style="contentStyle">
        <div class="modal-header">
          <slot name="header">
            <h2 v-if="title" class="accent-text">{{ title }}</h2>
          </slot>
          <X class="modal-close" :size="20" @click="$emit('close')"/>
        </div>
        <slot></slot>
      </div>
    </div>
  </Teleport>
</template>
