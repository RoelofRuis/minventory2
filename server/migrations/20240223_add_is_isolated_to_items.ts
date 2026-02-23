import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    if (await knex.schema.hasTable('items')) {
        const hasIsIsolated = await knex.schema.hasColumn('items', 'isIsolated');
        if (!hasIsIsolated) {
            await knex.schema.table('items', (table) => {
                table.boolean('isIsolated').defaultTo(false);
            });
        }
    }
}

export async function down(knex: Knex): Promise<void> {
    if (await knex.schema.hasTable('items')) {
        const hasIsIsolated = await knex.schema.hasColumn('items', 'isIsolated');
        if (hasIsIsolated) {
            await knex.schema.table('items', (table) => {
                table.dropColumn('isIsolated');
            });
        }
    }
}
