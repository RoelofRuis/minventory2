import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    if (!(await knex.schema.hasTable('artistic_questions'))) {
        await knex.schema.createTable('artistic_questions', (table) => {
            table.string('id', 26).primary();
            table.string('userId', 26).references('id').inTable('users').onDelete('CASCADE');
            table.binary('question').notNullable(); // Encrypted binary
            table.binary('answer').notNullable(); // Encrypted binary
            table.timestamp('createdAt').defaultTo(knex.fn.now());
            table.timestamp('updatedAt').defaultTo(knex.fn.now());
        });
    }
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('artistic_questions');
}
