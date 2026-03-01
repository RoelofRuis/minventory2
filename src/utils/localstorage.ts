export function getLocalStorageItem<T>(key: string, defaultValue: T): T {
    const item = localStorage.getItem(key);
    if (item === null) return defaultValue;

    if (typeof defaultValue === 'boolean') {
        return (item === 'true') as T;
    }
    if (typeof defaultValue === 'number') {
        const parsed = Number(item);
        return (isNaN(parsed) ? defaultValue : parsed) as T;
    }
    return item as T;
}
