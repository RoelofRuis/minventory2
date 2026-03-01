import { storeToRefs } from 'pinia';
import { useItemStore } from '../stores/item';
import { useFilterStore } from '../stores/filter';

export function useItems() {
  const store = useItemStore();
  const filterStore = useFilterStore();
  
  const { items, loading, filteredItems, totalIndividualItems } = storeToRefs(store);
  const { 
    selectedCategoryIds, 
    mode: filterMode, 
    selectedJoys, 
    selectedFrequencies, 
    selectedIntentions, 
    selectedAttachments,
    searchQuery
  } = storeToRefs(filterStore);

  return {
    items,
    loading,
    selectedCategoryIds,
    filterMode,
    searchQuery,
    selectedJoys,
    selectedFrequencies,
    selectedIntentions,
    selectedAttachments,
    fetchItems: store.fetchItems,
    fetchObjectUrl: store.fetchObjectUrl,
    filteredItems,
    totalIndividualItems,
    getDescendantIds: store.getDescendantIds
  };
}
