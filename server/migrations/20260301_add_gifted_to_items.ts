import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    if (await knex.schema.hasTable('items')) {
        const hasIsGifted = await knex.schema.hasColumn('items', 'isGifted');
        if (!hasIsGifted) {
            await knex.schema.table('items', (table) => {
                table.boolean('isGifted').defaultTo(false);
            });
        }
        const hasGiftedBy = await knex.schema.hasColumn('items', 'giftedBy');
        if (!hasGiftedBy) {
            await knex.schema.table('items', (table) => {
                table.binary('giftedBy').nullable();
            });
        }
    }
}

export async function down(knex: Knex): Promise<void> {
    if (await knex.schema.hasTable('items')) {
        await knex.schema.table('items', (table) => {
            table.dropColumn('isGifted');
            table.dropColumn('giftedBy');
        });
    }
}
