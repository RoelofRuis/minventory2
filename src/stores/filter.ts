import {ref, watch} from 'vue';

export type FilterMode = 'and' | 'or';

function loadIds(key: string): string[] {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
    } catch {
        return [];
    }
}

function loadMode(): FilterMode {
    const raw = localStorage.getItem('filter:mode');
    return raw === 'and' || raw === 'or' ? raw : 'or';
}

const selectedCategoryIds = ref<string[]>(loadIds('filter:selectedCategoryIds'));
const selectedJoys = ref<string[]>(loadIds('filter:selectedJoys'));
const selectedFrequencies = ref<string[]>(loadIds('filter:selectedFrequencies'));
const selectedIntentions = ref<string[]>(loadIds('filter:selectedIntentions'));
const selectedAttachments = ref<string[]>(loadIds('filter:selectedAttachments'));
const mode = ref<FilterMode>(loadMode());
const searchQuery = ref('');

export function filter() {
    // Persist to localStorage whenever values change
    watch(
        selectedCategoryIds,
        (ids) => {
            try {
                localStorage.setItem('filter:selectedCategoryIds', JSON.stringify(ids));
            } catch {
            }
        },
        {deep: true}
    );

    watch(
        selectedJoys,
        (val) => {
            try {
                localStorage.setItem('filter:selectedJoys', JSON.stringify(val));
            } catch {
            }
        },
        {deep: true}
    );

    watch(
        selectedFrequencies,
        (val) => {
            try {
                localStorage.setItem('filter:selectedFrequencies', JSON.stringify(val));
            } catch {
            }
        },
        {deep: true}
    );

    watch(
        selectedIntentions,
        (val) => {
            try {
                localStorage.setItem('filter:selectedIntentions', JSON.stringify(val));
            } catch {
            }
        },
        {deep: true}
    );

    watch(
        selectedAttachments,
        (val) => {
            try {
                localStorage.setItem('filter:selectedAttachments', JSON.stringify(val));
            } catch {
            }
        },
        {deep: true}
    );

    watch(mode, (m) => {
        try {
            localStorage.setItem('filter:mode', m);
        } catch {
        }
    });

    const setSelectedCategoryIds = (ids: string[]) => {
        selectedCategoryIds.value = [...ids];
    };

    const toggleSelectedCategoryId = (id: string) => {
        if (!Array.isArray(selectedCategoryIds.value)) {
            selectedCategoryIds.value = [];
        }
        const idx = selectedCategoryIds.value.indexOf(id);
        if (idx > -1) {
            selectedCategoryIds.value.splice(idx, 1);
        } else {
            selectedCategoryIds.value.push(id);
        }
    };

    const clear = () => {
        selectedCategoryIds.value = [];
        selectedJoys.value = [];
        selectedFrequencies.value = [];
        selectedIntentions.value = [];
        selectedAttachments.value = [];
    };

    const setMode = (m: FilterMode) => {
        mode.value = m;
    };

    return {
        selectedCategoryIds,
        selectedJoys,
        selectedFrequencies,
        selectedIntentions,
        selectedAttachments,
        mode,
        searchQuery,
        setSelectedCategoryIds,
        toggleSelectedCategoryId,
        setMode,
        clear,
    };
}
