import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable('quantity_transactions', (table) => {
        table.string('reason');
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable('quantity_transactions', (table) => {
        table.dropColumn('reason');
    });
}
