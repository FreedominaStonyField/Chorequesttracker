import bcrypt from 'bcrypt';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

import { db } from './client.js';
import {
  auditLog,
  cardInstances,
  cardTemplates,
  claims,
  completions,
  notificationPreferences,
  settings,
  userInventories,
  users
} from './schema.js';
import { config } from '../config.js';
import { spawnInstancesForActiveTemplates } from '../services/cardService.js';
import { DEFAULT_SETTINGS } from '../services/settingsService.js';

interface SeedUser {
  id: string;
  name: string;
  color: string;
  avatarEmoji: string;
  joinDate: string;
  isAdult?: boolean;
  pin: string;
}

interface SeedTemplate {
  id: string;
  title: string;
  flavorText?: string;
  difficulty: 'easy' | 'normal' | 'hard' | 'boss';
  points: number;
  recurrence: 'once' | 'daily' | 'weekly' | 'monthly';
  active: boolean;
  tags: string[];
  notes?: string;
  createdBy: string;
  weekAnchor?: number;
  monthAnchor?: number;
  requireProof?: boolean;
}

function createSeedUsers(): SeedUser[] {
  const today = new Date().toISOString();
  return [
    { id: 'ava', name: 'Ava', color: '#FDE68A', avatarEmoji: '🛡️', joinDate: today, isAdult: true, pin: '1111' },
    { id: 'milo', name: 'Milo', color: '#F9A8D4', avatarEmoji: '🧙', joinDate: today, pin: '2222' },
    { id: 'nova', name: 'Nova', color: '#93C5FD', avatarEmoji: '🗡️', joinDate: today, pin: '3333' },
    { id: 'zen', name: 'Zen', color: '#86EFAC', avatarEmoji: '🧝', joinDate: today, pin: '4444' }
  ];
}

const templateBlueprints: SeedTemplate[] = [
  {
    id: 'dish-daily',
    title: 'Dishes',
    flavorText: 'Scour the porcelain relics to lift the sink’s ancient curse.',
    difficulty: 'normal',
    points: 10,
    recurrence: 'daily',
    active: true,
    tags: ['kitchen', 'clean'],
    notes: 'Ensure counters are wiped.',
    createdBy: 'ava',
    weekAnchor: 1,
    monthAnchor: 1,
    requireProof: false
  },
  {
    id: 'trash-daily',
    title: 'Take out Trash',
    flavorText: 'Banish the refuse before the midnight vermin muster.',
    difficulty: 'easy',
    points: 6,
    recurrence: 'daily',
    active: true,
    tags: ['trash'],
    notes: '',
    createdBy: 'ava',
    weekAnchor: 1,
    monthAnchor: 1,
    requireProof: false
  },
  {
    id: 'laundry-weekly',
    title: 'Laundry Cycle',
    flavorText: 'Temper the fabric golems in suds and sun.',
    difficulty: 'hard',
    points: 14,
    recurrence: 'weekly',
    active: true,
    tags: ['laundry'],
    notes: 'Fold before dinner.',
    createdBy: 'ava',
    weekAnchor: 6,
    monthAnchor: 1,
    requireProof: true
  },
  {
    id: 'bathroom-weekly',
    title: 'Bathroom Purge',
    flavorText: 'Cleanse the mirror gate and the porcelain throne.',
    difficulty: 'hard',
    points: 15,
    recurrence: 'weekly',
    active: true,
    tags: ['bathroom', 'clean'],
    notes: 'Use eco cleaner.',
    createdBy: 'ava',
    weekAnchor: 0,
    monthAnchor: 1,
    requireProof: true
  },
  {
    id: 'garden-weekly',
    title: 'Garden Patrol',
    flavorText: 'Tend the sprouts so the yard spirits rejoice.',
    difficulty: 'normal',
    points: 12,
    recurrence: 'weekly',
    active: true,
    tags: ['outdoors'],
    notes: 'Water after 6pm.',
    createdBy: 'ava',
    weekAnchor: 5,
    monthAnchor: 1,
    requireProof: false
  },
  {
    id: 'vacuum-weekly',
    title: 'Grand Hall Sweep',
    flavorText: 'Drive the dust sprites from the carpets.',
    difficulty: 'normal',
    points: 11,
    recurrence: 'weekly',
    active: true,
    tags: ['clean'],
    notes: '',
    createdBy: 'ava',
    weekAnchor: 4,
    monthAnchor: 1,
    requireProof: false
  },
  {
    id: 'windows-monthly',
    title: 'Window Gleam',
    flavorText: 'Polish the crystal wards to welcome the dawn.',
    difficulty: 'hard',
    points: 25,
    recurrence: 'monthly',
    active: true,
    tags: ['clean'],
    notes: 'Use microfiber cloths.',
    createdBy: 'ava',
    weekAnchor: 1,
    monthAnchor: 5,
    requireProof: true
  },
  {
    id: 'budget-monthly',
    title: 'Council Budget Review',
    flavorText: 'Balance the kingdom accounts for the coming moon.',
    difficulty: 'boss',
    points: 40,
    recurrence: 'monthly',
    active: true,
    tags: ['admin'],
    notes: 'Review shared spreadsheet.',
    createdBy: 'ava',
    weekAnchor: 1,
    monthAnchor: 1,
    requireProof: false
  },
  {
    id: 'pantry-monthly',
    title: 'Pantry Audit',
    flavorText: 'Catalog the stores before the feasting season.',
    difficulty: 'normal',
    points: 18,
    recurrence: 'monthly',
    active: true,
    tags: ['kitchen'],
    notes: '',
    createdBy: 'ava',
    weekAnchor: 1,
    monthAnchor: 12,
    requireProof: false
  },
  {
    id: 'one-time-declutter',
    title: 'Treasure Hoard Declutter',
    flavorText: 'Sort the relics and banish forgotten trinkets.',
    difficulty: 'boss',
    points: 50,
    recurrence: 'once',
    active: true,
    tags: ['declutter'],
    notes: 'One-time weekend push.',
    createdBy: 'ava',
    weekAnchor: 1,
    monthAnchor: 1,
    requireProof: true
  },
  {
    id: 'pet-care-daily',
    title: 'Pet Care',
    flavorText: 'Feed the familiars and refresh their waters.',
    difficulty: 'easy',
    points: 5,
    recurrence: 'daily',
    active: true,
    tags: ['pets'],
    notes: '',
    createdBy: 'ava',
    weekAnchor: 1,
    monthAnchor: 1,
    requireProof: false
  },
  {
    id: 'homework-daily',
    title: 'Homework Patrol',
    flavorText: 'Ensure lessons are conquered before dusk.',
    difficulty: 'normal',
    points: 8,
    recurrence: 'daily',
    active: true,
    tags: ['study'],
    notes: '',
    createdBy: 'ava',
    weekAnchor: 1,
    monthAnchor: 1,
    requireProof: false
  }
];

async function seed() {
  await migrate(db, { migrationsFolder: './src/db/migrations' });

  await db.delete(auditLog); // clear logs for clean seed
  await db.delete(claims);
  await db.delete(completions);
  await db.delete(cardInstances);
  await db.delete(cardTemplates);
  await db.delete(users);
  await db.delete(userInventories);
  await db.delete(notificationPreferences);
  await db.delete(settings);

  const userRecords = createSeedUsers();
  for (const user of userRecords) {
    const hashed = await bcrypt.hash(user.pin, config.bcryptRounds);
    await db.insert(users).values({
      id: user.id,
      name: user.name,
      color: user.color,
      avatarEmoji: user.avatarEmoji,
      joinDate: new Date(user.joinDate),
      isAdult: user.isAdult ?? false,
      pinHash: hashed
    });
    await db.insert(userInventories).values({
      userId: user.id,
      items: [],
      badges: [],
      streaks: { daily: 0, weekly: 0, monthly: 0, once: 0, longest: {} },
      totalPoints: 0
    });
    await db.insert(notificationPreferences).values({
      userId: user.id,
      notifyOnLeaderboard: true,
      notifyOnNewQuests: true
    });
  }

  const timestamp = new Date();
  for (const template of templateBlueprints) {
    await db.insert(cardTemplates).values({
      id: template.id,
      title: template.title,
      flavorText: template.flavorText,
      difficulty: template.difficulty,
      points: template.points,
      recurrence: template.recurrence,
      active: template.active,
      tags: template.tags,
      notes: template.notes,
      createdBy: template.createdBy,
      createdAt: timestamp,
      updatedAt: timestamp,
      weekAnchor: template.weekAnchor,
      monthAnchor: template.monthAnchor,
      requireProof: template.requireProof ?? false
    });
  }

  await db.insert(settings).values({
    id: 1,
    refreshHour: DEFAULT_SETTINGS.refreshHour,
    weekAnchor: DEFAULT_SETTINGS.weekAnchor,
    monthAnchor: DEFAULT_SETTINGS.monthAnchor,
    proofRequiredTemplateIds: DEFAULT_SETTINGS.proofRequiredTemplateIds
  });

  await spawnInstancesForActiveTemplates();

  console.log('Database seeded');
}

await seed();
