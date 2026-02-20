import knex from 'knex';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { ulid } from 'ulid';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { categories as fixtureCategories, subCategories as fixtureSubCategories, items as fixtureItems, generatePlaceholderImage } from './fixtures.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function deriveKey(password, salt) {
    // Improved secure key derivation using scrypt with production-grade parameters
    return crypto.scryptSync(password, salt, 32, {
        N: 131072, // Cost factor: 2^17 (128MB RAM)
        r: 8,      // Block size
        p: 1,      // Parallelization factor
        maxmem: 256 * 1024 * 1024 // 256MB limit
    });
}

function encrypt(data, key) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]);
}

async function seed() {
    console.log('Starting seeding process (JS version)...');

    if (process.env.NODE_ENV === 'production') {
        console.error('CRITICAL: Database seeding is strictly prohibited in production mode for safety!');
        process.exit(1);
    }
    
    const usePostgres = process.env.DB_TYPE === 'postgres';
    if (!usePostgres) {
        console.log('Not using Postgres. In-memory database will be auto-seeded on server start.');
        return;
    }

    const db = knex({
        client: 'pg',
        connection: process.env.DATABASE_URL || 'postgres://user:password@localhost:5432/minventorydb'
    });

    try {
        // Run migrations before seeding
        console.log('Running migrations...');
        await db.migrate.latest({
            directory: path.join(__dirname, '../migrations'),
            loadExtensions: ['.js', '.ts']
        });
        console.log('Migrations completed.');

        console.log('Cleaning existing data...');
        await db('loans').del();
        await db('quantity_transactions').del();
        await db('item_categories').del();
        await db('items').del();
        // Clear parentId references first to avoid issues with self-referential foreign keys
        await db('categories').update({ parentId: null });
        await db('categories').del();
        await db('users').del();
        console.log('Database cleaned.');

        const username = 'admin';
        const password = 'password123';

        const existing = await db('users').where({ username }).first();
        if (existing) {
            console.log(`User ${username} already exists, skipping seeding.`);
            return;
        }

        console.log(`Creating user: ${username} / ${password}`);
        const passwordHash = await bcrypt.hash(password, 10);
        const salt = crypto.randomBytes(16).toString('hex');
        const userId = ulid();

        await db('users').insert({
            id: userId,
            username,
            passwordHash,
            twoFactorEnabled: false,
            encryptionKeySalt: salt
        });

        console.log('Adding sample categories...');
        const allCategories = [];
        const key = deriveKey(password, salt);

        // Add main categories
        for (const cat of fixtureCategories) {
            const id = ulid();
            await db('categories').insert({
                id,
                name: encrypt(cat.name, key),
                userId,
                parentId: null,
                private: cat.private,
                color: cat.color,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            allCategories.push({ ...cat, id });
        }

        // Add subcategories
        for (const sub of fixtureSubCategories) {
            const id = ulid();
            const parent = allCategories.find(c => c.name === sub.parentName);
            await db('categories').insert({
                id,
                name: encrypt(sub.name, key),
                userId,
                parentId: parent ? parent.id : null,
                private: sub.private,
                color: sub.color,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            allCategories.push({ ...sub, id });
        }

        console.log('Adding sample items with generated images...');
        
        for (const itemInfo of fixtureItems) {
            const encryptedName = encrypt(itemInfo.name, key);
            const itemId = ulid();
            
            const imageData = await generatePlaceholderImage(itemInfo.name);
            
            await db('items').insert({
                id: itemId,
                userId,
                name: encryptedName,
                imageBlob: encrypt(imageData.imageBlob, key),
                thumbnailBlob: encrypt(imageData.thumbnailBlob, key),
                imageMime: imageData.imageMime,
                thumbMime: imageData.thumbMime,
                imageWidth: imageData.imageWidth,
                imageHeight: imageData.imageHeight,
                thumbWidth: imageData.thumbWidth,
                thumbHeight: imageData.thumbHeight,
                createdAt: new Date(),
                updatedAt: new Date(),
                quantity: itemInfo.quantity,
                usageFrequency: itemInfo.usageFrequency,
                attachment: itemInfo.attachment,
                intention: itemInfo.intention,
                joy: itemInfo.joy
            });

            await db('quantity_transactions').insert({
                id: ulid(),
                itemId: itemId,
                delta: itemInfo.quantity,
                note: 'Initial quantity',
                createdAt: new Date()
            });

            // Add categories
            for (const catName of itemInfo.categories) {
                const cat = allCategories.find(c => c.name === catName);
                if (cat) {
                    await db('item_categories').insert({
                        itemId,
                        categoryId: cat.id
                    });
                }
            }

            // Add a loan if specified
            if (itemInfo.loan) {
                await db('loans').insert({
                    id: ulid(),
                    itemId,
                    borrower: itemInfo.loan.borrower,
                    note: itemInfo.loan.note,
                    quantity: itemInfo.quantity, // Assume all is lent if not specified
                    lentAt: new Date(),
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
            }
        }

        console.log('Seeding completed successfully!');
    } catch (err) {
        console.error('Error during seeding:', err);
    } finally {
        await db.destroy();
    }
}

seed();
