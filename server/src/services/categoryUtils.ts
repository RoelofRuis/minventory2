export function isPrivateRecursive(catId: string, allCategories: any[]): boolean {
    const cat = allCategories.find(c => c.id === catId);
    if (!cat) return false;
    if (cat.private) return true;
    if (cat.parentId) {
        return isPrivateRecursive(cat.parentId, allCategories);
    }
    return false;
}

export function getDescendantIds(parentId: string, allCategories: any[]): string[] {
    const descendants: string[] = [parentId];
    
    function findChildren(pid: string) {
        const children = allCategories.filter(c => c.parentId === pid);
        for (const child of children) {
            descendants.push(child.id);
            findChildren(child.id);
        }
    }
    
    findChildren(parentId);
    return descendants;
}
