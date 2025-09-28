export type ChoreTemplate = {
  id: string;
  title: string;
  description: string;
};

export const CHORE_LIBRARY: ChoreTemplate[] = [
  {
    id: 'dishes',
    title: 'Dish Duty',
    description: 'Wash and dry the dishes from today. Finish by wiping the counters.',
  },
  {
    id: 'laundry',
    title: 'Laundry Launch',
    description: 'Start a load of laundry and fold one finished load.',
  },
  {
    id: 'trash',
    title: 'Trash Trek',
    description: 'Collect all trash bins in the house and take the bags outside.',
  },
  {
    id: 'bathroom',
    title: 'Bathroom Blitz',
    description: 'Sanitize the sink, mirror, and toilet in one bathroom.',
  },
  {
    id: 'vacuum',
    title: 'Vacuum Voyage',
    description: 'Vacuum or sweep all high-traffic areas.',
  },
  {
    id: 'tidy',
    title: 'Tidy Triumph',
    description: 'Declutter one hotspot area for 15 minutes.',
  },
  {
    id: 'mealPrep',
    title: 'Meal Prep Mission',
    description: 'Plan or prep tomorrow’s meals, including lunches.',
  },
  {
    id: 'plants',
    title: 'Plant Patrol',
    description: 'Water houseplants and check their soil health.',
  },
  {
    id: 'floors',
    title: 'Floor Finale',
    description: 'Spot mop or wipe up any obvious spills on the floors.',
  },
  {
    id: 'inbox',
    title: 'Inbox Invasion',
    description: 'Clear five items from your email inbox or paperwork pile.',
  },
  {
    id: 'petCare',
    title: 'Creature Comforts',
    description: 'Refresh pet food/water stations and tidy their space.',
  },
  {
    id: 'car',
    title: 'Car Cleanup',
    description: 'Remove clutter from the car and wipe down the dashboard.',
  },
];
