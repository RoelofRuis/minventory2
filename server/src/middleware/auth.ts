import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        username: string;
        is2FAVerified: boolean;
    };
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        req.user = decoded;
        
        if (!decoded.is2FAVerified && req.path !== '/api/auth/verify-2fa') {
            return res.status(403).json({ error: '2FA verification required' });
        }
        
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};
