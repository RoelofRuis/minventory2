import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    if (!(await knex.schema.hasTable('users'))) {
        await knex.schema.createTable('users', (table) => {
            table.string('id', 26).primary();
            table.string('username').unique().notNullable();
            table.string('passwordHash').notNullable();
            table.string('twoFactorSecret');
            table.boolean('twoFactorEnabled').defaultTo(false);
            table.string('encryptionKeySalt').notNullable();
        });
    }

    if (!(await knex.schema.hasTable('items'))) {
        await knex.schema.createTable('items', (table) => {
            table.string('id', 26).primary();
            table.string('userId', 26).references('id').inTable('users').onDelete('CASCADE');
            table.binary('name').notNullable(); // Encrypted binary
            table.binary('imageBlob'); // Encrypted binary
            table.binary('thumbnailBlob'); // Encrypted binary
            table.string('imageMime');
            table.string('thumbMime');
            table.integer('imageWidth');
            table.integer('imageHeight');
            table.integer('thumbWidth');
            table.integer('thumbHeight');
            table.timestamp('createdAt').defaultTo(knex.fn.now());
            table.timestamp('updatedAt').defaultTo(knex.fn.now());
            table.float('quantity').defaultTo(0);
            table.string('usageFrequency').defaultTo('undefined');
            table.string('attachment').defaultTo('undefined');
            table.string('intention').defaultTo('undecided');
            table.string('joy').defaultTo('medium');
        });
    }

    if (!(await knex.schema.hasTable('categories'))) {
        await knex.schema.createTable('categories', (table) => {
            table.string('id', 26).primary();
            table.string('userId', 26).references('id').inTable('users').onDelete('CASCADE');
            table.binary('name').notNullable(); // Encrypted binary
            table.binary('description'); // Encrypted binary
            table.string('parentId', 26).references('id').inTable('categories').onDelete('SET NULL');
            table.boolean('private').defaultTo(false);
            table.integer('intentionalCount');
            table.string('color');
            table.integer('count').defaultTo(0);
            table.timestamp('createdAt').defaultTo(knex.fn.now());
            table.timestamp('updatedAt').defaultTo(knex.fn.now());
        });
    }

    if (!(await knex.schema.hasTable('item_categories'))) {
        await knex.schema.createTable('item_categories', (table) => {
            table.string('itemId', 26).references('id').inTable('items').onDelete('CASCADE');
            table.string('categoryId', 26).references('id').inTable('categories').onDelete('CASCADE');
            table.primary(['itemId', 'categoryId']);
        });
    }

    if (!(await knex.schema.hasTable('quantity_transactions'))) {
        await knex.schema.createTable('quantity_transactions', (table) => {
            table.string('id', 26).primary();
            table.string('itemId', 26).references('id').inTable('items').onDelete('CASCADE');
            table.float('delta').notNullable();
            table.text('note');
            table.timestamp('createdAt').defaultTo(knex.fn.now());
        });
    }

    if (!(await knex.schema.hasTable('loans'))) {
        await knex.schema.createTable('loans', (table) => {
            table.string('id', 26).primary();
            table.string('itemId', 26).references('id').inTable('items').onDelete('CASCADE');
            table.string('borrower').notNullable();
            table.text('note');
            table.float('quantity').notNullable();
            table.timestamp('lentAt').notNullable();
            table.timestamp('returnedAt');
            table.timestamp('createdAt').defaultTo(knex.fn.now());
            table.timestamp('updatedAt').defaultTo(knex.fn.now());
        });
    }
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('loans');
    await knex.schema.dropTableIfExists('quantity_transactions');
    await knex.schema.dropTableIfExists('item_categories');
    await knex.schema.dropTableIfExists('categories');
    await knex.schema.dropTableIfExists('items');
    await knex.schema.dropTableIfExists('users');
}
