import {storeToRefs} from 'pinia';
import {useItemStore} from '../stores/item';

export function useItems() {
    const store = useItemStore();

    // TODO: disentangle and combine with store!
    const {items, loading, filteredItems, totalIndividualItems} = storeToRefs(store);

    return {
        items,
        loading,
        fetchItems: store.fetchItems,
        fetchObjectUrl: store.fetchObjectUrl,
        filteredItems,
        totalIndividualItems,
        getDescendantIds: store.getDescendantIds
    };
}
