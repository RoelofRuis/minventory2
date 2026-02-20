export interface User {
    id: string;
    username: string;
    passwordHash: string;
    twoFactorSecret?: string;
    twoFactorEnabled: boolean;
    encryptionKeySalt: string;
}

export interface Item {
    id: string;
    userId: string;
    name: Buffer; // Encrypted Buffer
    imageBlob?: Buffer; // Encrypted Buffer
    thumbnailBlob?: Buffer; // Encrypted Buffer
    imageMime?: string;
    thumbMime?: string;
    imageWidth?: number;
    imageHeight?: number;
    thumbWidth?: number;
    thumbHeight?: number;
    createdAt: Date;
    updatedAt: Date;
    quantity: number; // Precomputed/cached
    usageFrequency: UsageFrequency;
    attachment: Attachment;
    intention: Intention;
    joy: Joy;
}

export interface Category {
    id: string;
    userId: string;
    name: Buffer; // Encrypted Buffer
    description?: Buffer; // Encrypted Buffer
    parentId?: string;
    private: boolean;
    intentionalCount?: number;
    color?: string;
    count: number; // Precomputed/cached
    createdAt: Date;
    updatedAt: Date;
}

export interface ItemCategory {
    itemId: string;
    categoryId: string;
}

export interface QuantityTransaction {
    id: string;
    itemId: string;
    delta: number;
    note?: string;
    createdAt: Date;
}

export interface Loan {
    id: string;
    itemId: string;
    borrower: string;
    note?: string;
    quantity: number;
    lentAt: Date;
    returnedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export enum UsageFrequency {
    Undefined = 'undefined',
    Daily = 'daily',
    Weekly = 'weekly',
    Monthly = 'monthly',
    Yearly = 'yearly',
    Seasonal = 'seasonal',
    Unused = 'unused'
}

export enum Attachment {
    Undefined = 'undefined',
    Replacable = 'replacable',
    Some = 'some',
    Strong = 'strong',
    Sentimental = 'sentimental'
}

export enum Intention {
    Undecided = 'undecided',
    Keep = 'keep',
    Sell = 'sell',
    Donate = 'donate',
    Maintain = 'maintain',
    Upgrade = 'upgrade',
    Dispose = 'dispose'
}

export enum Joy {
    Low = 'low',
    Medium = 'medium',
    High = 'high'
}
