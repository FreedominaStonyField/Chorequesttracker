import type { NextFunction, Request, Response } from 'express';

import { findUserByPinOrBypass } from '../../services/userService.js';

export async function pinAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.header('X-User-Id');
    const pin = req.header('X-User-PIN');
    if (!userId || !pin) {
      return res.status(401).json({ error: 'Missing credentials' });
    }
    const user = await findUserByPinOrBypass(userId, pin);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const { pinHash, ...safe } = user;
    req.authenticatedUser = safe;
    next();
  } catch (error) {
    next(error);
  }
}
