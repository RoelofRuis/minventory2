import { User, Item, Category, QuantityTransaction, Loan, ItemCategory, ArtisticQuestion } from '../models/types.js';
import { IUserRepository, IItemRepository, ICategoryRepository, IQuantityTransactionRepository, ILoanRepository, IArtisticQuestionRepository } from './interfaces.js';

export class InMemoryUserRepository implements IUserRepository {
    private users: Map<string, User> = new Map();

    async findByUsername(username: string): Promise<User | undefined> {
        return Array.from(this.users.values()).find(u => u.username === username);
    }

    async findById(id: string): Promise<User | undefined> {
        return this.users.get(id);
    }

    async create(user: User): Promise<void> {
        this.users.set(user.id, user);
    }

    async update(user: User): Promise<void> {
        this.users.set(user.id, user);
    }
}

export class InMemoryItemRepository implements IItemRepository {
    private items: Item[] = [];
    private itemCategories: ItemCategory[] = [];

    async findByUserId(userId: string, categoryIds?: string[]): Promise<Item[]> {
        let items = this.items.filter(i => i.userId === userId);
        if (categoryIds && categoryIds.length > 0) {
            const itemIdsWithCategories = new Set(
                this.itemCategories
                    .filter(ic => categoryIds.includes(ic.categoryId))
                    .map(ic => ic.itemId)
            );
            items = items.filter(i => itemIdsWithCategories.has(i.id));
        }
        return items;
    }

    async findById(id: string, userId: string): Promise<Item | undefined> {
        return this.items.find(i => i.id === id && i.userId === userId);
    }

    async create(item: Item): Promise<void> {
        this.items.push(item);
    }

    async update(item: Item): Promise<void> {
        const index = this.items.findIndex(i => i.id === item.id && i.userId === item.userId);
        if (index !== -1) {
            this.items[index] = item;
        }
    }

    async delete(id: string, userId: string): Promise<void> {
        this.items = this.items.filter(i => !(i.id === id && i.userId === userId));
        this.itemCategories = this.itemCategories.filter(ic => ic.itemId !== id);
    }

    async getItemCategories(itemId: string): Promise<string[]> {
        return this.itemCategories.filter(ic => ic.itemId === itemId).map(ic => ic.categoryId);
    }

    async setItemCategories(itemId: string, categoryIds: string[]): Promise<void> {
        this.itemCategories = this.itemCategories.filter(ic => ic.itemId !== itemId);
        categoryIds.forEach(categoryId => {
            this.itemCategories.push({ itemId, categoryId });
        });
    }

    async getCategoryCounts(userId: string): Promise<Record<string, number>> {
        const counts: Record<string, number> = {};
        this.itemCategories.forEach(ic => {
            const item = this.items.find(i => i.id === ic.itemId && i.userId === userId);
            if (item) {
                counts[ic.categoryId] = (counts[ic.categoryId] || 0) + item.quantity;
            }
        });
        return counts;
    }
}

export class InMemoryCategoryRepository implements ICategoryRepository {
    private categories: Category[] = [];

    async findByUserId(userId: string): Promise<Category[]> {
        return this.categories.filter(c => c.userId === userId);
    }

    async findById(id: string, userId: string): Promise<Category | undefined> {
        return this.categories.find(c => c.id === id && c.userId === userId);
    }

    async create(category: Category): Promise<void> {
        this.categories.push(category);
    }

    async update(category: Category): Promise<void> {
        const index = this.categories.findIndex(c => c.id === category.id && c.userId === category.userId);
        if (index !== -1) {
            this.categories[index] = category;
        }
    }

    async delete(id: string, userId: string): Promise<void> {
        this.categories = this.categories.filter(c => !(c.id === id && c.userId === userId));
    }
}

export class InMemoryQuantityTransactionRepository implements IQuantityTransactionRepository {
    private transactions: QuantityTransaction[] = [];

    async findByItemId(itemId: string): Promise<QuantityTransaction[]> {
        return this.transactions.filter(t => t.itemId === itemId);
    }

    async create(transaction: QuantityTransaction): Promise<void> {
        this.transactions.push(transaction);
    }
}

export class InMemoryLoanRepository implements ILoanRepository {
    private loans: Loan[] = [];

    async findByItemId(itemId: string): Promise<Loan[]> {
        return this.loans.filter(l => l.itemId === itemId);
    }

    async findByUserId(userId: string): Promise<Loan[]> {
        // In this simple single-user app, we return all loans.
        // In a real app we'd join with items to filter by userId.
        return this.loans;
    }

    async findById(id: string): Promise<Loan | undefined> {
        return this.loans.find(l => l.id === id);
    }

    async create(loan: Loan): Promise<void> {
        this.loans.push(loan);
    }

    async update(loan: Loan): Promise<void> {
        const index = this.loans.findIndex(l => l.id === loan.id);
        if (index !== -1) {
            this.loans[index] = loan;
        }
    }

    async delete(id: string): Promise<void> {
        this.loans = this.loans.filter(l => l.id !== id);
    }
}

export class InMemoryArtisticQuestionRepository implements IArtisticQuestionRepository {
    private questions: ArtisticQuestion[] = [];

    async findByUserId(userId: string): Promise<ArtisticQuestion[]> {
        return this.questions.filter(q => q.userId === userId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    async findById(id: string, userId: string): Promise<ArtisticQuestion | undefined> {
        return this.questions.find(q => q.id === id && q.userId === userId);
    }

    async create(question: ArtisticQuestion): Promise<void> {
        this.questions.push(question);
    }

    async update(question: ArtisticQuestion): Promise<void> {
        const index = this.questions.findIndex(q => q.id === question.id && q.userId === question.userId);
        if (index !== -1) {
            this.questions[index] = question;
        }
    }

    async delete(id: string, userId: string): Promise<void> {
        this.questions = this.questions.filter(q => !(q.id === id && q.userId === userId));
    }
}
