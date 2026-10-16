import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { getOrCreateUser } from '../db/users.ts';

export interface AuthenticatedRequest extends Request {
  user?: any;
}

export const authenticateUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const user = await getOrCreateUser(
      decodedToken.uid,
      decodedToken.email || `${decodedToken.uid}@ksrtc.in`,
      decodedToken.name
    );
    req.user = user;
    next();
  } catch (error) {
    console.error('Error verifying token or fetching user:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};
