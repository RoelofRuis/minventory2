import { Knex } from 'knex';
import { User, Item, Category, QuantityTransaction, Loan, ArtisticQuestion } from '../models/types.js';
import { IUserRepository, IItemRepository, ICategoryRepository, IQuantityTransactionRepository, ILoanRepository, IArtisticQuestionRepository } from './interfaces.js';

export class PostgresUserRepository implements IUserRepository {
    constructor(private knex: Knex) {}

    async findByUsername(username: string): Promise<User | undefined> {
        return this.knex('users').where({ username }).first();
    }

    async findById(id: string): Promise<User | undefined> {
        return this.knex('users').where({ id }).first();
    }

    async create(user: User): Promise<void> {
        await this.knex('users').insert(user);
    }

    async update(user: User): Promise<void> {
        await this.knex('users').where({ id: user.id }).update(user);
    }
}

export class PostgresItemRepository implements IItemRepository {
    constructor(private knex: Knex) {}

    async findByUserId(userId: string, categoryIds?: string[]): Promise<Item[]> {
        let query = this.knex('items').where({ userId });
        
        if (categoryIds && categoryIds.length > 0) {
            query = query.whereIn('id', function() {
                this.select('itemId').from('item_categories').whereIn('categoryId', categoryIds);
            });
        }
        
        return query;
    }

    async findById(id: string, userId: string): Promise<Item | undefined> {
        return this.knex('items').where({ id, userId }).first();
    }

    async create(item: Item): Promise<void> {
        await this.knex('items').insert(item);
    }

    async update(item: Item): Promise<void> {
        await this.knex('items').where({ id: item.id, userId: item.userId }).update(item);
    }

    async delete(id: string, userId: string): Promise<void> {
        await this.knex.transaction(async trx => {
            await trx('item_categories').where({ itemId: id }).del();
            await trx('quantity_transactions').where({ itemId: id }).del();
            await trx('loans').where({ itemId: id }).del();
            await trx('items').where({ id, userId }).del();
        });
    }

    async getItemCategories(itemId: string): Promise<string[]> {
        const results = await this.knex('item_categories').where({ itemId }).select('categoryId');
        return results.map(r => r.categoryId);
    }

    async setItemCategories(itemId: string, categoryIds: string[]): Promise<void> {
        await this.knex.transaction(async trx => {
            await trx('item_categories').where({ itemId }).del();
            if (categoryIds.length > 0) {
                await trx('item_categories').insert(
                    categoryIds.map(categoryId => ({ itemId, categoryId }))
                );
            }
        });
    }

    async getCategoryCounts(userId: string): Promise<Record<string, number>> {
        const results = await this.knex('item_categories')
            .join('items', 'item_categories.itemId', '=', 'items.id')
            .where('items.userId', userId)
            .select('item_categories.categoryId')
            .sum('items.quantity as count')
            .groupBy('item_categories.categoryId');
        
        const counts: Record<string, number> = {};
        for (const r of results) {
            counts[r.categoryId] = parseFloat(r.count as any) || 0;
        }
        return counts;
    }
}

export class PostgresCategoryRepository implements ICategoryRepository {
    constructor(private knex: Knex) {}

    async findByUserId(userId: string): Promise<Category[]> {
        return this.knex('categories').where({ userId });
    }

    async findById(id: string, userId: string): Promise<Category | undefined> {
        return this.knex('categories').where({ id, userId }).first();
    }

    async create(category: Category): Promise<void> {
        await this.knex('categories').insert(category);
    }

    async update(category: Category): Promise<void> {
        await this.knex('categories').where({ id: category.id, userId: category.userId }).update(category);
    }

    async delete(id: string, userId: string): Promise<void> {
        await this.knex.transaction(async trx => {
            await trx('item_categories').where({ categoryId: id }).del();
            await trx('categories').where({ id, userId }).del();
        });
    }
}

export class PostgresQuantityTransactionRepository implements IQuantityTransactionRepository {
    constructor(private knex: Knex) {}

    async findByItemId(itemId: string): Promise<QuantityTransaction[]> {
        return this.knex('quantity_transactions').where({ itemId }).orderBy('createdAt', 'desc');
    }

    async create(transaction: QuantityTransaction): Promise<void> {
        await this.knex('quantity_transactions').insert(transaction);
    }
}

export class PostgresLoanRepository implements ILoanRepository {
    constructor(private knex: Knex) {}

    async findByItemId(itemId: string): Promise<Loan[]> {
        return this.knex('loans').where({ itemId }).orderBy('createdAt', 'desc');
    }

    async findByUserId(userId: string): Promise<Loan[]> {
        return this.knex('loans')
            .join('items', 'loans.itemId', '=', 'items.id')
            .where('items.userId', userId)
            .select('loans.*');
    }

    async findById(id: string): Promise<Loan | undefined> {
        return this.knex('loans').where({ id }).first();
    }

    async create(loan: Loan): Promise<void> {
        await this.knex('loans').insert(loan);
    }

    async update(loan: Loan): Promise<void> {
        await this.knex('loans').where({ id: loan.id }).update(loan);
    }

    async delete(id: string): Promise<void> {
        await this.knex('loans').where({ id }).del();
    }
}

export class PostgresArtisticQuestionRepository implements IArtisticQuestionRepository {
    constructor(private knex: Knex) {}

    async findByUserId(userId: string): Promise<ArtisticQuestion[]> {
        return this.knex('artistic_questions').where({ userId }).orderBy('createdAt', 'desc');
    }

    async findById(id: string, userId: string): Promise<ArtisticQuestion | undefined> {
        return this.knex('artistic_questions').where({ id, userId }).first();
    }

    async create(question: ArtisticQuestion): Promise<void> {
        await this.knex('artistic_questions').insert(question);
    }

    async update(question: ArtisticQuestion): Promise<void> {
        await this.knex('artistic_questions').where({ id: question.id, userId: question.userId }).update(question);
    }

    async delete(id: string, userId: string): Promise<void> {
        await this.knex('artistic_questions').where({ id, userId }).del();
    }
}
