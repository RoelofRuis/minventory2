import { IItemRepository, IUserRepository, ICategoryRepository, IQuantityTransactionRepository, ILoanRepository } from '../repositories/interfaces.js';
import { Item, UsageFrequency, Attachment, Intention, Joy, QuantityTransaction, Category, TransactionReason } from '../models/types.js';
import { encrypt, decrypt, deriveKey } from './encryption.js';
import { ulid } from 'ulid';
import sharp from 'sharp';
import { isPrivateRecursive, getDescendantIds } from './categoryUtils.js';

export class ItemService {
    constructor(
        private itemRepository: IItemRepository,
        private userRepository: IUserRepository,
        private categoryRepository: ICategoryRepository,
        private transactionRepository: IQuantityTransactionRepository,
        private loanRepository: ILoanRepository
    ) {}

    async createItem(userId: string, encryptionKey: Buffer, itemData: any, imageBuffer?: Buffer): Promise<string> {
        const encryptedName = encrypt(itemData.name || 'Unnamed Item', encryptionKey);
        
        let encryptedImage: Buffer | undefined;
        let encryptedThumb: Buffer | undefined;
        let imageMime: string | undefined;
        let thumbMime: string | undefined;
        let imageWidth: number | undefined;
        let imageHeight: number | undefined;
        let thumbWidth: number | undefined;
        let thumbHeight: number | undefined;

        if (imageBuffer) {
            const optimized = await this.makeOptimized(imageBuffer);
            encryptedImage = encrypt(optimized.original, encryptionKey);
            encryptedThumb = encrypt(optimized.thumb, encryptionKey);
            imageMime = optimized.imageMime;
            thumbMime = optimized.thumbMime;
            imageWidth = optimized.imageWidth;
            imageHeight = optimized.imageHeight;
            thumbWidth = optimized.thumbWidth;
            thumbHeight = optimized.thumbHeight;
        }

        const itemId = ulid();
        let quantity = parseFloat(itemData.quantity);
        if (isNaN(quantity)) quantity = 1;
        if (quantity < 0) quantity = 0;

        const item: Item = {
            id: itemId,
            userId,
            name: encryptedName,
            imageBlob: encryptedImage,
            thumbnailBlob: encryptedThumb,
            imageMime,
            thumbMime,
            imageWidth,
            imageHeight,
            thumbWidth,
            thumbHeight,
            createdAt: new Date(),
            updatedAt: new Date(),
            quantity,
            usageFrequency: itemData.usageFrequency || UsageFrequency.Undefined,
            attachment: itemData.attachment || Attachment.Undefined,
            intention: itemData.intention || Intention.Undecided,
            joy: itemData.joy || Joy.Medium,
            isIsolated: itemData.isIsolated === 'true' || itemData.isIsolated === true
        };

        await this.itemRepository.create(item);
        
        if (itemData.categoryIds) {
            const categoryIds = typeof itemData.categoryIds === 'string' ? JSON.parse(itemData.categoryIds) : itemData.categoryIds;
            if (Array.isArray(categoryIds)) {
                await this.itemRepository.setItemCategories(itemId, categoryIds);
            }
        }

        if (item.quantity !== 0) {
            await this.transactionRepository.create({
                id: ulid(),
                itemId: itemId,
                delta: item.quantity,
                note: 'Initial quantity',
                createdAt: new Date()
            });
        }

        return itemId;
    }

    async updateItem(userId: string, encryptionKey: Buffer, itemId: string, itemData: any, imageBuffer?: Buffer): Promise<void> {
        const existingItem = await this.itemRepository.findById(itemId, userId);
        if (!existingItem) throw new Error('Item not found');

        if (itemData.name) {
            existingItem.name = encrypt(itemData.name, encryptionKey);
        }
        
        if (imageBuffer) {
            const optimized = await this.makeOptimized(imageBuffer);
            existingItem.imageBlob = encrypt(optimized.original, encryptionKey);
            existingItem.thumbnailBlob = encrypt(optimized.thumb, encryptionKey);
            existingItem.imageMime = optimized.imageMime;
            existingItem.thumbMime = optimized.thumbMime;
            existingItem.imageWidth = optimized.imageWidth;
            existingItem.imageHeight = optimized.imageHeight;
            existingItem.thumbWidth = optimized.thumbWidth;
            existingItem.thumbHeight = optimized.thumbHeight;
        } else if (itemData.removeImage === 'true' || itemData.removeImage === true) {
            existingItem.imageBlob = undefined;
            existingItem.thumbnailBlob = undefined;
            existingItem.imageMime = undefined;
            existingItem.thumbMime = undefined;
            existingItem.imageWidth = undefined;
            existingItem.imageHeight = undefined;
            existingItem.thumbWidth = undefined;
            existingItem.thumbHeight = undefined;
        }

        existingItem.updatedAt = new Date();
        if (itemData.usageFrequency) existingItem.usageFrequency = itemData.usageFrequency;
        if (itemData.attachment) existingItem.attachment = itemData.attachment;
        if (itemData.intention) existingItem.intention = itemData.intention;
        if (itemData.joy) existingItem.joy = itemData.joy;
        if (itemData.isIsolated !== undefined) {
            existingItem.isIsolated = itemData.isIsolated === 'true' || itemData.isIsolated === true;
        }

        await this.itemRepository.update(existingItem);

        if (itemData.categoryIds) {
            const categoryIds = typeof itemData.categoryIds === 'string' ? JSON.parse(itemData.categoryIds) : itemData.categoryIds;
            if (Array.isArray(categoryIds)) {
                await this.itemRepository.setItemCategories(itemId, categoryIds);
            }
        }
    }

    async getItems(userId: string, encryptionKey: Buffer, showPrivate: boolean = false, categoryId?: string): Promise<any[]> {
        const allCategories = await this.categoryRepository.findByUserId(userId);
        const privateCategoryIds = new Set<string>();

        for (const cat of allCategories) {
            if (isPrivateRecursive(cat.id, allCategories)) {
                privateCategoryIds.add(cat.id);
            }
        }

        let categoryIds: string[] | undefined;
        if (categoryId) {
            categoryIds = getDescendantIds(categoryId, allCategories);
        }

        let items = await this.itemRepository.findByUserId(userId, categoryIds);
        
        const results = (await Promise.all(items.map(async item => {
            try {
                const itemCategoryIds = await this.itemRepository.getItemCategories(item.id);
                const isPrivate = itemCategoryIds.some(id => privateCategoryIds.has(id));

                if (isPrivate && !showPrivate) {
                    return null;
                }

                let nameBuffer = Buffer.isBuffer(item.name) ? item.name : Buffer.from(item.name, 'base64');
                let decryptedName: string;
                
                try {
                    decryptedName = decrypt(nameBuffer, encryptionKey).toString();
                } catch (err) {
                    // Fallback for old data stored as base64 string in binary column
                    const decodedBuffer = Buffer.from(nameBuffer.toString(), 'base64');
                    decryptedName = decrypt(decodedBuffer, encryptionKey).toString();
                }

                return {
                    ...item,
                    name: decryptedName,
                    image: null,
                    imageUrl: item.imageBlob ? `/api/items/${item.id}/image` : null,
                    thumbUrl: item.thumbnailBlob ? `/api/items/${item.id}/thumb` : null,
                    imageBlob: undefined,
                    thumbnailBlob: undefined,
                    categoryIds: itemCategoryIds,
                    private: isPrivate
                };
            } catch (err) {
                return { ...item, name: '[Decryption Failed]', imageBlob: undefined, private: false };
            }
        }))).filter(item => item !== null);
        
        return results.sort((a, b) => a.name.localeCompare(b.name));
    }

    async getItem(userId: string, encryptionKey: Buffer, itemId: string, showPrivate: boolean = false): Promise<any> {
        const item = await this.itemRepository.findById(itemId, userId);
        if (!item) throw new Error('Item not found');

        const allCategories = await this.categoryRepository.findByUserId(userId);
        const privateCategoryIds = new Set<string>();

        for (const cat of allCategories) {
            if (isPrivateRecursive(cat.id, allCategories)) {
                privateCategoryIds.add(cat.id);
            }
        }

        const itemCategoryIds = await this.itemRepository.getItemCategories(item.id);
        const isPrivate = itemCategoryIds.some(id => privateCategoryIds.has(id));

        if (isPrivate && !showPrivate) {
            throw new Error('Access denied: Item is private');
        }

        let nameBuffer = Buffer.isBuffer(item.name) ? item.name : Buffer.from(item.name, 'base64');
        let decryptedName: string;
        
        try {
            decryptedName = decrypt(nameBuffer, encryptionKey).toString();
        } catch (err) {
            // Fallback for old data stored as base64 string in binary column
            const decodedBuffer = Buffer.from(nameBuffer.toString(), 'base64');
            decryptedName = decrypt(decodedBuffer, encryptionKey).toString();
        }

        let decryptedImage = '';
        if (item.imageBlob) {
            decryptedImage = decrypt(item.imageBlob, encryptionKey).toString('base64');
        }
        
        const categoryIds = await this.itemRepository.getItemCategories(item.id);
        const transactions = await this.transactionRepository.findByItemId(item.id);
        const loans = await this.loanRepository.findByItemId(item.id);

        return {
            ...item,
            name: decryptedName,
            image: decryptedImage ? `data:image/jpeg;base64,${decryptedImage}` : null,
            imageUrl: item.imageBlob ? `/api/items/${item.id}/image` : null,
            thumbUrl: item.thumbnailBlob ? `/api/items/${item.id}/thumb` : null,
            imageBlob: undefined,
            thumbnailBlob: undefined,
            categoryIds: itemCategoryIds,
            transactions,
            loans,
            private: isPrivate
        };
    }

    async deleteItem(userId: string, itemId: string): Promise<void> {
        await this.itemRepository.delete(itemId, userId);
    }

    async getItemImage(userId: string, encryptionKey: Buffer, itemId: string): Promise<{ buffer: Buffer, mime: string } | null> {
        const item = await this.itemRepository.findById(itemId, userId);
        if (!item || !item.imageBlob) return null;
        
        const decrypted = decrypt(item.imageBlob, encryptionKey);
        return { buffer: decrypted, mime: item.imageMime || 'image/jpeg' };
    }

    async getItemThumbnail(userId: string, encryptionKey: Buffer, itemId: string): Promise<{ buffer: Buffer, mime: string } | null> {
        const item = await this.itemRepository.findById(itemId, userId);
        if (!item || !item.thumbnailBlob) return null;
        
        const decrypted = decrypt(item.thumbnailBlob, encryptionKey);
        return { buffer: decrypted, mime: item.thumbMime || 'image/webp' };
    }

    private async makeOptimized(imageBuffer: Buffer) {
        const input = sharp(imageBuffer, { failOn: 'none' });
        
        // Auto-orient and resize original
        const originalBuffer = await input
            .rotate()
            .resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 75, effort: 4 })
            .toBuffer();

        const originalMeta = await sharp(originalBuffer).metadata();

        // Create thumbnail
        const thumbBuffer = await sharp(imageBuffer)
            .rotate()
            .resize({ width: 256, height: 256, fit: 'cover' })
            .webp({ quality: 70, effort: 4 })
            .toBuffer();

        const thumbMeta = await sharp(thumbBuffer).metadata();

        return {
            original: originalBuffer,
            imageMime: 'image/webp',
            imageWidth: originalMeta.width,
            imageHeight: originalMeta.height,
            thumb: thumbBuffer,
            thumbMime: 'image/webp',
            thumbWidth: thumbMeta.width,
            thumbHeight: thumbMeta.height
        };
    }

    async addTransaction(userId: string, itemId: string, delta: number, note?: string, reason?: TransactionReason): Promise<void> {
        const item = await this.itemRepository.findById(itemId, userId);
        if (!item) throw new Error('Item not found');

        const transaction: QuantityTransaction = {
            id: ulid(),
            itemId,
            delta,
            note,
            reason,
            createdAt: new Date()
        };

        await this.transactionRepository.create(transaction);

        item.quantity += delta;
        item.updatedAt = new Date();
        await this.itemRepository.update(item);
    }
}
