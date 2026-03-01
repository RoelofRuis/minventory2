import {getLocalStorageItem} from "../utils/localstorage.ts";
import {ref} from "vue";

const gridColumns = ref<number>(getLocalStorageItem('gridColumns', 3));

export function useSettings() {
    const setGridColumns = (cols: number) => {
        const cappedCols = Math.min(Math.max(cols, 1), 5);
        gridColumns.value = cappedCols;
        localStorage.setItem('gridColumns', String(cappedCols));
    };

    return {
        gridColumns,
        setGridColumns
    }
}