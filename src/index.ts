import { createApp } from './app.js';
import { config } from './config.js';
import { startScheduler } from './jobs/scheduler.js';

const app = createApp();

app.listen(config.port, () => {
  console.log(`QuestBoard server listening on port ${config.port}`);
});

startScheduler();
