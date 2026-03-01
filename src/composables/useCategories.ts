import { storeToRefs } from 'pinia';
import { useCategoryStore } from '../stores/category';

export function useCategories() {
  const store = useCategoryStore();
  const { categories } = storeToRefs(store);

  return {
    categories,
    fetchCategories: store.fetchCategories,
    getCategoryName: store.getCategoryName,
    getCategoryColor: store.getCategoryColor
  };
}
