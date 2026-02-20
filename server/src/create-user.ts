import knex from 'knex';
import { PostgresUserRepository } from './repositories/postgres.js';
import { AuthService } from './services/auth.js';
import dotenv from 'dotenv';
import { generateSecret, generateURI } from 'otplib';
import qrcode from 'qrcode';

dotenv.config();

async function main() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.log('Usage: npm run create-user <username> <password>');
        process.exit(1);
    }

    const [username, password] = args;

    const db = knex({
        client: 'pg',
        connection: process.env.DATABASE_URL || 'postgres://user:password@localhost:5432/minventorydb'
    });

    const userRepository = new PostgresUserRepository(db);
    const authService = new AuthService(userRepository);

    try {
        console.log(`Creating user: ${username}...`);
        const user = await authService.register(username, password);
        
        // Manually setup 2FA
        const secret = generateSecret();
        const otpauth = generateURI({ secret, label: username, issuer: 'Minventory' });
        
        user.twoFactorSecret = secret;
        user.twoFactorEnabled = true; // Force enable it
        await userRepository.update(user);

        console.log('\nUser created successfully!');
        console.log('---------------------------');
        console.log('Username:  ', username);
        console.log('2FA Secret:', secret);
        console.log('2FA URI:   ', otpauth);
        console.log('---------------------------\n');
        
        console.log('Scan this QR code with your Authenticator app (e.g., Google Authenticator):');
        const qrCodeTerminal = await qrcode.toString(otpauth, { type: 'terminal', small: true });
        console.log(qrCodeTerminal);
        
        console.log('\nAfter scanning, you can log in to the app with your password and the 2FA code.');
    } catch (err: any) {
        console.error('\nError:', err.message);
    } finally {
        await db.destroy();
    }
}

main();
