import { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        username: string;
        is2FAVerified: boolean;
    };
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    req.user = req.session.user;
    const allowedWithout2FA = ['/api/auth/verify-2fa', '/api/auth/me', '/api/auth/logout'];

    if (!req.user.is2FAVerified && !allowedWithout2FA.includes(req.path)) {
        return res.status(403).json({ error: '2FA verification required' });
    }

    next();
};
