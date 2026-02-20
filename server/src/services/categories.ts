import { ICategoryRepository, IItemRepository } from '../repositories/interfaces.js';
import { Category } from '../models/types.js';
import { ulid } from 'ulid';
import { encrypt, decrypt } from './encryption.js';
import { isPrivateRecursive, getDescendantIds } from './categoryUtils.js';

export class CategoryService {
    constructor(private categoryRepository: ICategoryRepository, private itemRepository: IItemRepository) {}

    async createCategory(userId: string, encryptionKey: Buffer, data: any): Promise<string> {
        const id = ulid();
        const category: Category = {
            id,
            userId,
            name: encrypt(data.name, encryptionKey),
            description: data.description ? encrypt(data.description, encryptionKey) : undefined,
            parentId: data.parentId,
            private: data.private !== undefined ? (data.private === 'true' || data.private === true) : (!!data.parentId),
            intentionalCount: data.intentionalCount ? parseInt(data.intentionalCount) : undefined,
            color: data.color,
            count: 0,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        await this.categoryRepository.create(category);
        return id;
    }

    async updateCategory(userId: string, encryptionKey: Buffer, id: string, data: any): Promise<void> {
        const category = await this.categoryRepository.findById(id, userId);
        if (!category) throw new Error('Category not found');

        if (data.name !== undefined) category.name = encrypt(data.name, encryptionKey);
        if (data.description !== undefined) category.description = data.description ? encrypt(data.description, encryptionKey) : undefined;
        if (data.parentId !== undefined) category.parentId = data.parentId;
        if (data.private !== undefined) category.private = data.private === 'true' || data.private === true;
        if (data.intentionalCount !== undefined) category.intentionalCount = data.intentionalCount ? parseInt(data.intentionalCount) : undefined;
        if (data.color !== undefined) category.color = data.color;
        category.updatedAt = new Date();

        await this.categoryRepository.update(category);
    }

    async getCategories(userId: string, encryptionKey: Buffer, showPrivate: boolean = false): Promise<any[]> {
        const categories = await this.categoryRepository.findByUserId(userId);
        const directCounts = await this.itemRepository.getCategoryCounts(userId);

        const decryptedCategories = categories.map(cat => {
            let decryptedName = '[Decryption Failed]';
            let decryptedDescription = undefined;

            try {
                decryptedName = decrypt(cat.name, encryptionKey).toString();
            } catch (err) {
                // Fallback for existing plain text data migrated to binary
                decryptedName = cat.name.toString();
            }

            if (cat.description) {
                try {
                    decryptedDescription = decrypt(cat.description, encryptionKey).toString();
                } catch (err) {
                    decryptedDescription = cat.description.toString();
                }
            }

            return {
                ...cat,
                name: decryptedName,
                description: decryptedDescription
            };
        });

        const memo = new Map<string, number>();

        const getRecursiveCount = (id: string): number => {
            if (memo.has(id)) return memo.get(id)!;
            let total = directCounts[id] || 0;
            const children = decryptedCategories.filter(c => c.parentId === id);
            for (const child of children) {
                total += getRecursiveCount(child.id);
            }
            memo.set(id, total);
            return total;
        };

        const categoriesWithCounts = decryptedCategories.map(cat => ({
            ...cat,
            count: getRecursiveCount(cat.id),
            isPrivate: isPrivateRecursive(cat.id, decryptedCategories)
        }));

        if (!showPrivate) {
            return categoriesWithCounts.filter(category => !category.isPrivate);
        }
        return categoriesWithCounts;
    }

    async getDescendantIds(userId: string, parentId: string): Promise<string[]> {
        const categories = await this.categoryRepository.findByUserId(userId);
        return getDescendantIds(parentId, categories);
    }

    async deleteCategory(userId: string, id: string): Promise<void> {
        await this.categoryRepository.delete(id, userId);
    }
}
