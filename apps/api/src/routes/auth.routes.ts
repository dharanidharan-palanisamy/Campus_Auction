import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models';
import { generateToken, authenticateToken, AuthRequest } from '../middlewares/auth';
import { registerSchema, loginSchema } from '@campus/shared';
import { emitAdminEvent } from '../lib/socket';

export const authRouter = Router();

authRouter.post('/register', async (req, res) => {
  try {
    const validated = registerSchema.parse(req.body);

    const existingUser = await User.findOne({
      $or: [
        { email: validated.email.toLowerCase() },
        { studentId: validated.studentId },
      ],
    });

    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Student email or ID already registered' });
    }

    const passwordHash = await bcrypt.hash(validated.password, 10);

    const user = await User.create({
      email: validated.email.toLowerCase(),
      passwordHash,
      fullName: validated.fullName,
      campusAlias: validated.campusAlias,
      studentId: validated.studentId,
      role: 'STUDENT',
      isEmailVerified: true,
      verificationStatus: 'PENDING',
      accountStatus: 'ACTIVE',
    });

    const userPayload = {
      id: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
      campusAlias: user.campusAlias,
      studentId: user.studentId,
      role: user.role,
    };

    const token = generateToken(userPayload);
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 3600 * 1000,
    });

    // Notify Admin Panel in real time
    emitAdminEvent('student:registered', {
      student: {
        ...userPayload,
        verificationStatus: 'PENDING',
        createdAt: user.createdAt.toISOString(),
      },
    });

    return res.status(201).json({ success: true, user: userPayload, token });
  } catch (error: any) {
    if (error?.errors) {
      const msg = error.errors.map((e: any) => `${e.path?.join('.') || 'field'}: ${e.message}`).join('; ');
      return res.status(400).json({ success: false, message: msg });
    }
    return res.status(400).json({ success: false, message: error.message || 'Registration failed' });
  }
});

authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (user.isSuspended) {
      return res.status(403).json({ success: false, message: 'Account has been suspended' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    user.lastLogin = new Date();
    await user.save();

    const userPayload = {
      id: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
      campusAlias: user.campusAlias,
      studentId: user.studentId,
      role: user.role,
    };

    const token = generateToken(userPayload);
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 3600 * 1000,
    });

    return res.json({ success: true, user: userPayload, token });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message || 'Login failed' });
  }
});

authRouter.post('/logout', (req, res) => {
  res.clearCookie('token');
  return res.json({ success: true, message: 'Logged out successfully' });
});

authRouter.get('/me', authenticateToken, async (req: AuthRequest, res) => {
  return res.json({ success: true, user: req.user });
});
