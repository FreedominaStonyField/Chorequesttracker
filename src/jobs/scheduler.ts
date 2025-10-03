import cron from 'node-cron';

import { config } from '../config.js';
import { expireOverdueInstances, spawnInstancesForActiveTemplates } from '../services/cardService.js';

export function startScheduler(): void {
  cron.schedule(
    '0 0 * * *',
    async () => {
      await spawnInstancesForActiveTemplates(new Date());
      await expireOverdueInstances(new Date());
    },
    { timezone: config.timezone }
  );
}
