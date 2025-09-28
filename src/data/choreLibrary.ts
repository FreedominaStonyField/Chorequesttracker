export type ChoreTemplate = {
  id: string;
  title: string;
  description: string;
  minPercent: number;
  maxPercent: number;
};

export const DEFAULT_CHORE_LIBRARY: ChoreTemplate[] = [
  {
    id: 'dishes',
    title: 'Dish Duty',
    description: 'Wash and dry the dishes from today. Finish by wiping the counters.',
    minPercent: 8,
    maxPercent: 18,
  },
  {
    id: 'laundry',
    title: 'Laundry Launch',
    description: 'Start a load of laundry and fold one finished load.',
    minPercent: 8,
    maxPercent: 18,
  },
  {
    id: 'trash',
    title: 'Trash Trek',
    description: 'Collect all trash bins in the house and take the bags outside.',
    minPercent: 5,
    maxPercent: 12,
  },
  {
    id: 'bathroom',
    title: 'Bathroom Blitz',
    description: 'Sanitize the sink, mirror, and toilet in one bathroom.',
    minPercent: 6,
    maxPercent: 15,
  },
  {
    id: 'vacuum',
    title: 'Vacuum Voyage',
    description: 'Vacuum or sweep all high-traffic areas.',
    minPercent: 6,
    maxPercent: 16,
  },
  {
    id: 'tidy',
    title: 'Tidy Triumph',
    description: 'Declutter one hotspot area for 15 minutes.',
    minPercent: 4,
    maxPercent: 10,
  },
  {
    id: 'mealPrep',
    title: 'Meal Prep Mission',
    description: 'Plan or prep tomorrow’s meals, including lunches.',
    minPercent: 5,
    maxPercent: 14,
  },
  {
    id: 'plants',
    title: 'Plant Patrol',
    description: 'Water houseplants and check their soil health.',
    minPercent: 3,
    maxPercent: 8,
  },
  {
    id: 'floors',
    title: 'Floor Finale',
    description: 'Spot mop or wipe up any obvious spills on the floors.',
    minPercent: 5,
    maxPercent: 14,
  },
  {
    id: 'inbox',
    title: 'Inbox Invasion',
    description: 'Clear five items from your email inbox or paperwork pile.',
    minPercent: 3,
    maxPercent: 7,
  },
  {
    id: 'petCare',
    title: 'Creature Comforts',
    description: 'Refresh pet food/water stations and tidy their space.',
    minPercent: 4,
    maxPercent: 12,
  },
  {
    id: 'car',
    title: 'Car Cleanup',
    description: 'Remove clutter from the car and wipe down the dashboard.',
    minPercent: 4,
    maxPercent: 11,
  },
];
