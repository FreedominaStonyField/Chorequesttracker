import { Router } from 'express';

import auditRouter from './audit.js';
import cardsRouter, { claimsRouter } from './cards.js';
import feedRouter from './feed.js';
import historyRouter from './history.js';
import inventoryRouter from './inventory.js';
import leaderboardRouter from './leaderboard.js';
import settingsRouter from './settings.js';
import syncRouter from './sync.js';
import templatesRouter from './templates.js';
import usersRouter from './users.js';
import { pinAuth } from './middleware/auth.js';

const router = Router();

router.use(pinAuth);
router.use('/users', usersRouter);
router.use('/templates', templatesRouter);
router.use('/feed', feedRouter);
router.use('/cards', cardsRouter);
router.use('/claims', claimsRouter);
router.use('/leaderboard', leaderboardRouter);
router.use('/history', historyRouter);
router.use('/inventory', inventoryRouter);
router.use('/settings', settingsRouter);
router.use('/sync', syncRouter);
router.use('/audit-log', auditRouter);

export default router;
