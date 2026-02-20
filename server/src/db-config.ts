import dotenv from 'dotenv';
dotenv.config();

export const getDbConfig = () => {
    if (process.env.DATABASE_URL) {
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
    };
};
