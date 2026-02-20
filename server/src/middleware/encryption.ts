import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';

export function encryptionMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
    const keyHex = req.session.encryptionKey;
    if (!keyHex) {
        return res.status(401).json({ error: 'Encryption key not found in session. Please log in again.' });
    }
    
    (req as any).encryptionKey = Buffer.from(keyHex, 'hex');
    next();
}

export interface EncryptionRequest extends AuthRequest {
    encryptionKey: Buffer;
}
