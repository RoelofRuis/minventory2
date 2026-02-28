import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    if (await knex.schema.hasTable('items')) {
        const hasIsBorrowed = await knex.schema.hasColumn('items', 'isBorrowed');
        if (!hasIsBorrowed) {
            await knex.schema.table('items', (table) => {
                table.boolean('isBorrowed').defaultTo(false);
            });
        }
        const hasBorrowedFrom = await knex.schema.hasColumn('items', 'borrowedFrom');
        if (!hasBorrowedFrom) {
            await knex.schema.table('items', (table) => {
                table.binary('borrowedFrom').nullable();
            });
        }
    }
}

export async function down(knex: Knex): Promise<void> {
    if (await knex.schema.hasTable('items')) {
        await knex.schema.table('items', (table) => {
            table.dropColumn('isBorrowed');
            table.dropColumn('borrowedFrom');
        });
    }
}
