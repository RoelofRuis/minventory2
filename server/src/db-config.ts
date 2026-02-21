import dotenv from 'dotenv';
dotenv.config();

export const getDbConfig = () => {
    const ssl = process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false;

    if (process.env.DATABASE_URL) {
        if (ssl) {
            // If DATABASE_URL is used and SSL is requested, we might need to ensure it's handled.
            // Knex can take an object with connection string and ssl.
            return {
                connectionString: process.env.DATABASE_URL,
                ssl: ssl
            };
        }
        return process.env.DATABASE_URL;
    }

    const portStr = process.env.POSTGRES_PORT || '5432';
    const port = parseInt(portStr, 10);

    return {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: isNaN(port) ? 5432 : port,
        user: process.env.POSTGRES_USER || 'user',
        password: process.env.POSTGRES_PASSWORD || 'password',
        database: process.env.POSTGRES_DB || 'minventorydb',
        ssl: ssl
    };
};
