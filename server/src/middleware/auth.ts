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

    if (!req.user.is2FAVerified && req.path !== '/api/auth/verify-2fa') {
        return res.status(403).json({ error: '2FA verification required' });
    }

    next();
};
