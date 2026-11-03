import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models';

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  campusAlias: string;
  studentId?: string;
  role: string;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-token-campus-auction-development-key-32chars';

export const generateToken = (user: AuthenticatedUser): string => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      campusAlias: user.campusAlias,
      studentId: user.studentId,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    let token: string | undefined;
    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.admin_token) {
      token = req.cookies.admin_token;
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;

    // Verify user still exists and not suspended
    const user = await User.findById(decoded.id).select(
      'email fullName campusAlias studentId role isSuspended'
    );

    if (!user || user.isSuspended) {
      return res.status(403).json({ success: false, message: 'Account is suspended or inactive' });
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
      campusAlias: user.campusAlias,
      studentId: user.studentId,
      role: user.role,
    };
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired session' });
  }
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Admin privileges required' });
  }
  next();
};
