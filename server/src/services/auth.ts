import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { generateSecret, verifySync, generateURI } from 'otplib';
import qrcode from 'qrcode';
import { ulid } from 'ulid';
import { IUserRepository } from '../repositories/interfaces.js';
import { User } from '../models/types.js';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

export class AuthService {
    constructor(private userRepository: IUserRepository) {}

    async register(username: string, password: string): Promise<User> {
        const existing = await this.userRepository.findByUsername(username);
        if (existing) throw new Error('User already exists');

        const passwordHash = await bcrypt.hash(password, 10);
        const salt = crypto.randomBytes(16).toString('hex');
        const user: User = {
            id: ulid(),
            username,
            passwordHash,
            twoFactorEnabled: false,
            encryptionKeySalt: salt
        };

        await this.userRepository.create(user);
        return user;
    }

    async login(username: string, password: string): Promise<{ user: User, requires2FA: boolean }> {
        const user = await this.userRepository.findByUsername(username);
        if (!user) throw new Error('Invalid credentials');

        const match = await bcrypt.compare(password, user.passwordHash);
        if (!match) throw new Error('Invalid credentials');

        return { user, requires2FA: user.twoFactorEnabled };
    }

    async verifyPassword(user: User, password: string): Promise<boolean> {
        return bcrypt.compare(password, user.passwordHash);
    }

    async generate2FA(user: User): Promise<{ secret: string, qrCode: string }> {
        const secret = generateSecret();
        const otpauth = generateURI({ secret, label: user.username, issuer: 'Minventory' });
        const qrCode = await qrcode.toDataURL(otpauth);
        
        user.twoFactorSecret = secret;
        await this.userRepository.update(user);
        
        return { secret, qrCode };
    }

    async verify2FA(user: User, token: string): Promise<boolean> {
        if (!user.twoFactorSecret) return false;
        const isValid = verifySync({ token, secret: user.twoFactorSecret }).valid;
        if (isValid && !user.twoFactorEnabled) {
            user.twoFactorEnabled = true;
            await this.userRepository.update(user);
        }
        return isValid;
    }

    generateToken(user: User, is2FAVerified: boolean): string {
        return jwt.sign({ 
            id: user.id, 
            username: user.username,
            is2FAVerified 
        }, JWT_SECRET, { expiresIn: '1h' });
    }
}
