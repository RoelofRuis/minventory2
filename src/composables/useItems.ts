import {storeToRefs} from 'pinia';
import {useItemStore} from '../stores/item';
import {useFilters} from "./useFilters.ts";

export function useItems() {
    const store = useItemStore();

    const {items, loading, filteredItems, totalIndividualItems} = storeToRefs(store);
    const {
        selectedCategoryIds,
        mode: filterMode,
        selectedJoys,
        selectedFrequencies,
        selectedIntentions,
        selectedAttachments,
        searchQuery
    } = useFilters();

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
