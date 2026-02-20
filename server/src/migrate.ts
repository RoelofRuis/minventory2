import knex from 'knex';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
    const db = knex({
        client: 'pg',
        connection: process.env.DATABASE_URL || 'postgres://user:password@localhost:5432/minventorydb'
    });

    try {
        console.log('Running migrations...');
        await db.migrate.latest({
            directory: path.join(__dirname, '../migrations'),
            loadExtensions: ['.js', '.ts']
        });
        console.log('Migrations completed successfully.');
    } catch (error) {
        console.error('Error running migrations:', error);
        process.exit(1);
    } finally {
        await db.destroy();
    }
}

runMigrations();
