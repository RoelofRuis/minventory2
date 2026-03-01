import express from 'express';
import dotenv from 'dotenv';
import knex from 'knex';
import { PostgresUserRepository, PostgresItemRepository, PostgresCategoryRepository, PostgresQuantityTransactionRepository, PostgresLoanRepository, PostgresArtisticQuestionRepository } from './repositories/postgres.js';
import { InMemoryUserRepository, InMemoryItemRepository, InMemoryCategoryRepository, InMemoryQuantityTransactionRepository, InMemoryLoanRepository, InMemoryArtisticQuestionRepository } from './repositories/inMemory.js';
import { AuthService } from './services/auth.js';
import { ItemService } from './services/items.js';
import { CategoryService } from './services/categories.js';
import { LoanService } from './services/loans.js';
import { ArtisticQuestionService } from './services/artisticQuestions.js';
import { authMiddleware, AuthRequest } from './middleware/auth.js';
import { encryptionMiddleware, EncryptionRequest } from './middleware/encryption.js';
import { deriveKey } from './services/encryption.js';
import multer from 'multer';
import session from 'express-session';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pgSession from 'connect-pg-simple';
import { getDbConfig } from './db-config.js';

const PostgresStore = pgSession(session);

declare module 'express-session' {
  interface SessionData {
    user?: {
        id: string;
        username: string;
        is2FAVerified: boolean;
    };
    encryptionKey?: string;
    privateUnlocked?: boolean;
  }
}

dotenv.config();

import path from 'path';
import { fileURLToPath } from 'url';
import { categories as fixtureCategories, subCategories as fixtureSubCategories, items as fixtureItems, artisticQuestions as fixtureQuestions, generatePlaceholderImage } from './fixtures.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'blob:', 'data:'],
        connectSrc: ["'self'", 'blob:', 'data:'],
        scriptSrc: ["'self'", "'unsafe-eval'", "'wasm-unsafe-eval'", "blob:"],
        workerSrc: ["'self'", 'blob:'],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: []
    }
  },
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginEmbedderPolicy: { policy: "require-corp" },
  crossOriginResourcePolicy: { policy: "same-origin" }
}));

const usePostgres = process.env.DB_TYPE === 'postgres';
const dbConfig = getDbConfig();

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret && process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET must be set in production');
}

app.use(session({
    store: usePostgres ? new PostgresStore({ 
        ...(typeof dbConfig === 'string' 
            ? { conString: dbConfig } 
            : (dbConfig as any).connectionString 
                ? { conString: (dbConfig as any).connectionString, ssl: (dbConfig as any).ssl }
                : { conObject: dbConfig as any }),
        createTableIfMissing: true 
    }) : undefined,
    secret: sessionSecret || 'session-secret',
    resave: false,
    saveUninitialized: false,
    name: 'sid',
    cookie: { 
        secure: process.env.NODE_ENV === 'production', 
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Rate limiting
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 requests per windowMs
    message: 'Too many requests, please try again later'
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/verify-2fa', authLimiter);
app.use('/api/auth/unlock-private', authLimiter);

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, '../../public')));

const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    fileFilter: (req, file, cb) => {
        const ok = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
        if (ok) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'));
        }
    }
});

let userRepository: any;
let itemRepository: any;
let categoryRepository: any;
let transactionRepository: any;
let loanRepository: any;

let authService: AuthService;
let itemService: ItemService;
let categoryService: CategoryService;
let loanService: LoanService;
let artisticQuestionService: ArtisticQuestionService;

async function initDB() {
    if (usePostgres) {
        const db = knex({
            client: 'pg',
            connection: dbConfig
        });

        // Run migrations
        try {
            await db.migrate.latest({
                directory: path.join(__dirname, '../migrations'),
                loadExtensions: ['.js', '.ts']
            });
            console.log('PostgreSQL migrations completed.');
        } catch (err) {
            console.error('PostgreSQL migration failed:', err);
            // Don't exit here, maybe we can still start? 
            // Actually for dev/prod stability, if Postgres is requested but fails to migrate, we should probably know.
        }

        userRepository = new PostgresUserRepository(db);
        itemRepository = new PostgresItemRepository(db);
        categoryRepository = new PostgresCategoryRepository(db);
        transactionRepository = new PostgresQuantityTransactionRepository(db);
        loanRepository = new PostgresLoanRepository(db);
        const artisticQuestionRepository = new PostgresArtisticQuestionRepository(db);
        artisticQuestionService = new ArtisticQuestionService(artisticQuestionRepository);
    } else {
        userRepository = new InMemoryUserRepository();
        itemRepository = new InMemoryItemRepository();
        categoryRepository = new InMemoryCategoryRepository();
        transactionRepository = new InMemoryQuantityTransactionRepository();
        loanRepository = new InMemoryLoanRepository();
        const artisticQuestionRepository = new InMemoryArtisticQuestionRepository();
        artisticQuestionService = new ArtisticQuestionService(artisticQuestionRepository);
    }

    authService = new AuthService(userRepository);
    itemService = new ItemService(itemRepository, userRepository, categoryRepository, transactionRepository, loanRepository);
    categoryService = new CategoryService(categoryRepository, itemRepository);
    loanService = new LoanService(loanRepository, itemRepository);

    // Auto-seed in-memory database if empty
    if (!usePostgres) {
        const username = 'admin';
        const password = 'password123';
        const existing = await userRepository.findByUsername(username);
        if (!existing) {
            console.log('Seeding in-memory database with more sample data...');
            const user = await authService.register(username, password);
            const key = await deriveKey(password, user.encryptionKeySalt);
            
            // Create categories
            const allCategories: any[] = [];
            for (const cat of fixtureCategories) {
                const id: string = await (categoryService as any).createCategory(user.id, key, { 
                    name: cat.name, 
                    color: cat.color, 
                    private: cat.private 
                });
                allCategories.push({ ...cat, id });
            }
            
            // Create subcategories
            for (const sub of fixtureSubCategories) {
                const parentCat: any = allCategories.find(c => c.name === sub.parentName);
                const subId: string = await (categoryService as any).createCategory(user.id, key, { 
                    name: sub.name, 
                    parentId: parentCat ? parentCat.id : null, 
                    color: sub.color, 
                    private: sub.private 
                });
                allCategories.push({ ...sub, id: subId });
            }

            const cats = await (categoryService as any).getCategories(user.id, key, true);
            const getCatId = (name: string) => (cats as any[]).find(c => c.name === name)?.id;
            
            for (const itemInfo of fixtureItems) {
                const imageData = await (generatePlaceholderImage as any)(itemInfo.name);
                const categoryIds = (itemInfo.categories as string[]).map(name => getCatId(name)).filter(Boolean);
                
                const itemId = await itemService.createItem(user.id, key, { 
                    name: itemInfo.name, 
                    categoryIds,
                    quantity: itemInfo.quantity,
                    usageFrequency: itemInfo.usageFrequency,
                    attachment: itemInfo.attachment,
                    intention: itemInfo.intention,
                    joy: itemInfo.joy
                }, imageData.imageBlob);

                if (itemInfo.loan) {
                    await loanService.createLoan(user.id, itemId, {
                        borrower: itemInfo.loan.borrower,
                        note: itemInfo.loan.note,
                        quantity: itemInfo.quantity
                    });
                }
            }

            for (const q of fixtureQuestions) {
                await artisticQuestionService.createQuestion(user.id, key, q.question, q.answer);
            }
            console.log('In-memory seeding complete.');
        }
    }
}

await initDB();

// Auth routes
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const { user, requires2FA } = await authService.login(username, password);
        
        // Derive encryption key and store in session
        const key = await deriveKey(password, user.encryptionKeySalt);
        
        const is2FABypassed = process.env.BYPASS_2FA === 'true';
        const needs2FA = requires2FA && !is2FABypassed;

        req.session.regenerate((err) => {
            if (err) return res.status(500).json({ error: 'Could not regenerate session' });
            
            req.session.user = { 
                id: user.id, 
                username: user.username, 
                is2FAVerified: !needs2FA 
            };
            req.session.encryptionKey = key.toString('hex');
            req.session.privateUnlocked = false;
            
            res.json({ requires2FA: needs2FA });
        });
    } catch (err: any) {
        // Generic error message to avoid user enumeration
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// Logout route
app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Could not log out' });
        }
        res.json({ message: 'Logged out' });
    });
});

app.get('/logout', (req, res) => {
    res.redirect('/login');
});

app.post('/logout', (req, res) => {
    res.redirect('/login');
});

app.post('/api/auth/verify-2fa', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { token } = req.body;
        const user = await userRepository.findById(req.user!.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        
        const isValid = await authService.verify2FA(user, token);
        if (isValid) {
            if (req.session.user) {
                req.session.user.is2FAVerified = true;
            }
            res.json({ message: '2FA verified' });
        } else {
            res.status(400).json({ error: 'Invalid token' });
        }
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/unlock-private', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { password } = req.body;
        const user = await userRepository.findById(req.user!.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const isValid = await authService.verifyPassword(user, password);
        if (isValid) {
            req.session.privateUnlocked = true;
            res.json({ message: 'Private items unlocked' });
        } else {
            res.status(401).json({ error: 'Invalid password' });
        }
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/lock-private', authMiddleware, (req: AuthRequest, res) => {
    req.session.privateUnlocked = false;
    res.json({ message: 'Private items locked' });
});

app.get('/api/auth/me', authMiddleware, (req: AuthRequest, res) => {
    res.json({
        ...req.user,
        privateUnlocked: req.session.privateUnlocked || false
    });
});

// Item routes
app.get('/api/items', authMiddleware, encryptionMiddleware, async (req: any, res) => {
    try {
        const ereq = req as EncryptionRequest;
        const showPrivate = ereq.session.privateUnlocked || false;
        const categoryId = ereq.query.categoryId as string | undefined;
        
        const items = await itemService.getItems(ereq.user!.id, ereq.encryptionKey, showPrivate, categoryId);
        res.json(items);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/items/:id', authMiddleware, encryptionMiddleware, async (req: any, res) => {
    try {
        const ereq = req as EncryptionRequest;
        const showPrivate = ereq.session.privateUnlocked || false;
        
        const item = await itemService.getItem(ereq.user!.id, ereq.encryptionKey, ereq.params.id as string, showPrivate);
        res.json(item);
    } catch (err: any) {
        res.status(404).json({ error: err.message });
    }
});

// Image streaming routes (async, cached)
app.get('/api/items/:id/thumb', authMiddleware, encryptionMiddleware, async (req: any, res) => {
    try {
        const ereq = req as EncryptionRequest;
        const data = await itemService.getItemThumbnail(ereq.user!.id, ereq.encryptionKey, ereq.params.id as string);
        if (!data) return res.sendStatus(404);

        const etag = 'W/"' + (ereq.query.v || '') + String(ereq.params.id) + '"';
        if (ereq.headers['if-none-match'] === etag) return res.sendStatus(304);

        res.setHeader('Content-Type', data.mime || 'image/webp');
        res.setHeader('Cache-Control', 'private, max-age=3600');
        if (ereq.query.v) {
            res.setHeader('ETag', etag);
        }
        res.end(data.buffer);
    } catch (err: any) {
        res.status(500).json({ error: 'Failed to load thumbnail' });
    }
});

app.get('/api/items/:id/image', authMiddleware, encryptionMiddleware, async (req: any, res) => {
    try {
        const ereq = req as EncryptionRequest;
        const data = await itemService.getItemImage(ereq.user!.id, ereq.encryptionKey, ereq.params.id as string);
        if (!data) return res.sendStatus(404);

        const etag = 'W/"' + (ereq.query.v || '') + String(ereq.params.id) + '"';
        if (ereq.headers['if-none-match'] === etag) return res.sendStatus(304);

        res.setHeader('Content-Type', data.mime || 'image/webp');
        res.setHeader('Cache-Control', 'private, max-age=3600');
        if (ereq.query.v) {
            res.setHeader('ETag', etag);
        }
        res.end(data.buffer);
    } catch (err: any) {
        res.status(500).json({ error: 'Failed to load image' });
    }
});

app.post('/api/items', authMiddleware, encryptionMiddleware, upload.single('image'), async (req: any, res) => {
    try {
        const ereq = req as EncryptionRequest;
        const imageBuffer = ereq.file?.buffer;
        const itemId = await itemService.createItem(ereq.user!.id, ereq.encryptionKey, ereq.body, imageBuffer);
        res.status(201).json({ id: itemId, message: 'Item created' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/items/:id', authMiddleware, encryptionMiddleware, upload.single('image'), async (req: any, res) => {
    try {
        const ereq = req as EncryptionRequest;
        const imageBuffer = ereq.file?.buffer;
        await itemService.updateItem(ereq.user!.id, ereq.encryptionKey, ereq.params.id as string, ereq.body, imageBuffer);
        res.json({ message: 'Item updated' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/items/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
        await itemService.deleteItem(req.user!.id, req.params.id as string);
        res.json({ message: 'Item deleted' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/items/:id/transactions', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { delta, note, reason } = req.body;
        await itemService.addTransaction(req.user!.id, req.params.id as string, parseFloat(delta), note, reason);
        res.status(201).json({ message: 'Transaction added' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Category routes
app.get('/api/categories', authMiddleware, encryptionMiddleware, async (req: any, res) => {
    try {
        const ereq = req as EncryptionRequest;
        const showPrivate = ereq.session.privateUnlocked || false;
        const categories = await categoryService.getCategories(ereq.user!.id, ereq.encryptionKey, showPrivate);
        res.json(categories);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/categories', authMiddleware, encryptionMiddleware, async (req: any, res) => {
    try {
        const ereq = req as EncryptionRequest;
        const categoryId = await categoryService.createCategory(ereq.user!.id, ereq.encryptionKey, ereq.body);
        res.status(201).json({ id: categoryId, message: 'Category created' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/categories/:id', authMiddleware, encryptionMiddleware, async (req: any, res) => {
    try {
        const ereq = req as EncryptionRequest;
        await categoryService.updateCategory(ereq.user!.id, ereq.encryptionKey, ereq.params.id as string, ereq.body);
        res.json({ message: 'Category updated' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/categories/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
        await categoryService.deleteCategory(req.user!.id, req.params.id as string);
        res.json({ message: 'Category deleted' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Loan routes
app.get('/api/loans', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const loans = await loanService.getLoans(req.user!.id);
        res.json(loans);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/items/:itemId/loans', authMiddleware, async (req: AuthRequest, res) => {
    try {
        await loanService.createLoan(req.user!.id, req.params.itemId as string, req.body);
        res.status(201).json({ message: 'Loan created' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/loans/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
        await loanService.updateLoan(req.user!.id, req.params.id as string, req.body);
        res.json({ message: 'Loan updated' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/loans/:id/return', authMiddleware, async (req: AuthRequest, res) => {
    try {
        await loanService.returnLoan(req.user!.id, req.params.id as string);
        res.json({ message: 'Loan returned' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/loans/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
        await loanService.deleteLoan(req.user!.id, req.params.id as string);
        res.json({ message: 'Loan deleted' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Artistic Question routes
app.get('/api/artistic-questions', authMiddleware, encryptionMiddleware, async (req: any, res) => {
    try {
        const ereq = req as EncryptionRequest;
        const questions = await artisticQuestionService.getQuestions(ereq.user!.id, ereq.encryptionKey);
        res.json(questions);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/artistic-questions', authMiddleware, encryptionMiddleware, async (req: any, res) => {
    try {
        const ereq = req as EncryptionRequest;
        const { question, answer } = ereq.body;
        const id = await artisticQuestionService.createQuestion(ereq.user!.id, ereq.encryptionKey, question, answer);
        res.status(201).json({ id, message: 'Question created' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/artistic-questions/:id', authMiddleware, encryptionMiddleware, async (req: any, res) => {
    try {
        const ereq = req as EncryptionRequest;
        const { question, answer } = ereq.body;
        await artisticQuestionService.updateQuestion(ereq.user!.id, ereq.encryptionKey, ereq.params.id, question, answer);
        res.json({ message: 'Question updated' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/artistic-questions/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
        await artisticQuestionService.deleteQuestion(req.user!.id, req.params.id);
        res.json({ message: 'Question deleted' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;

// Catch-all route to serve index.html for SPA (excluding /api)
app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../../index.html'));
});

const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

process.on('SIGTERM', () => {
    server.close();
});
