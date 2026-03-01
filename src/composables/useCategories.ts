import { storeToRefs } from 'pinia';
import { useCategoryStore } from '../stores/category';
import {computed} from "vue";
import {useAuthStore} from "../stores/auth.ts";

export function useCategories() {
  const authStore = useAuthStore();
  const categoryStore = useCategoryStore();
  const { categories } = storeToRefs(categoryStore);

  const visibleCategories = computed(() => {
    return authStore.showPrivate ? categories.value : categories.value.filter(c => !c.private);
  });

  return {
    categories,
    visibleCategories,
    fetchCategories: categoryStore.fetchCategories,
    getCategoryName: categoryStore.getCategoryName,
    getCategoryColor: categoryStore.getCategoryColor
  };
}
