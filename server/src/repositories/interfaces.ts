import { User, Item, Category, QuantityTransaction, Loan } from '../models/types.js';

export interface IUserRepository {
    findByUsername(username: string): Promise<User | undefined>;
    findById(id: string): Promise<User | undefined>;
    create(user: User): Promise<void>;
    update(user: User): Promise<void>;
}

export interface IItemRepository {
    findByUserId(userId: string, categoryIds?: string[]): Promise<Item[]>;
    findById(id: string, userId: string): Promise<Item | undefined>;
    create(item: Item): Promise<void>;
    update(item: Item): Promise<void>;
    delete(id: string, userId: string): Promise<void>;
    
    // Many-to-many categories
    getItemCategories(itemId: string): Promise<string[]>; // returns category IDs
    setItemCategories(itemId: string, categoryIds: string[]): Promise<void>;
    getCategoryCounts(userId: string): Promise<Record<string, number>>; // map of categoryId -> sum of quantities
}

export interface ICategoryRepository {
    findByUserId(userId: string): Promise<Category[]>;
    findById(id: string, userId: string): Promise<Category | undefined>;
    create(category: Category): Promise<void>;
    update(category: Category): Promise<void>;
    delete(id: string, userId: string): Promise<void>;
}

export interface IQuantityTransactionRepository {
    findByItemId(itemId: string): Promise<QuantityTransaction[]>;
    create(transaction: QuantityTransaction): Promise<void>;
}

export interface ILoanRepository {
    findByItemId(itemId: string): Promise<Loan[]>;
    findByUserId(userId: string): Promise<Loan[]>;
    findById(id: string): Promise<Loan | undefined>;
    create(loan: Loan): Promise<void>;
    update(loan: Loan): Promise<void>;
    delete(id: string): Promise<void>;
}
