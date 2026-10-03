import { Group, GroupMember, Task, Profile, AwayPeriod, TaskCompletion } from '@/types';
import { addDays, formatISO, subDays } from 'date-fns';

export const MOCK_PROFILES: Profile[] = [
  {
    id: 'user-ahmed',
    name: 'Ahmed',
    username: 'ahmed',
    password: 'password123',
    email: 'ahmed@greenhouse.flat',
    avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'user-rahul',
    name: 'Rahul',
    username: 'rahul',
    password: 'password123',
    email: 'rahul@greenhouse.flat',
    avatar_url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'user-sameer',
    name: 'Sameer',
    username: 'sameer',
    password: 'password123',
    email: 'sameer@greenhouse.flat',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'user-usman',
    name: 'Usman',
    username: 'usman',
    password: 'password123',
    email: 'usman@greenhouse.flat',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  },
];

export const MOCK_GROUP_ID = 'group-green-house';

export const MOCK_GROUP: Group = {
  id: MOCK_GROUP_ID,
  name: 'Green House',
  invite_code: 'X7K92P',
  admin_user_id: 'user-ahmed',
  timezone: 'Asia/Kolkata',
  created_at: subDays(new Date(), 30).toISOString(),
  member_count: 4,
};

export const MOCK_AWAY_PERIODS: AwayPeriod[] = [
  {
    id: 'away-sameer-1',
    group_id: MOCK_GROUP_ID,
    user_id: 'user-sameer',
    start_at: subDays(new Date(), 1).toISOString(),
    end_at: addDays(new Date(), 6).toISOString(),
    created_at: subDays(new Date(), 1).toISOString(),
  },
];

export const MOCK_MEMBERS: GroupMember[] = [
  {
    id: 'gm-ahmed',
    group_id: MOCK_GROUP_ID,
    user_id: 'user-ahmed',
    role: 'admin',
    joined_at: subDays(new Date(), 30).toISOString(),
    profile: MOCK_PROFILES[0],
    is_away: false,
  },
  {
    id: 'gm-rahul',
    group_id: MOCK_GROUP_ID,
    user_id: 'user-rahul',
    role: 'member',
    joined_at: subDays(new Date(), 28).toISOString(),
    profile: MOCK_PROFILES[1],
    is_away: false,
  },
  {
    id: 'gm-sameer',
    group_id: MOCK_GROUP_ID,
    user_id: 'user-sameer',
    role: 'member',
    joined_at: subDays(new Date(), 25).toISOString(),
    profile: MOCK_PROFILES[2],
    is_away: true,
    away_period: MOCK_AWAY_PERIODS[0],
  },
  {
    id: 'gm-usman',
    group_id: MOCK_GROUP_ID,
    user_id: 'user-usman',
    role: 'member',
    joined_at: subDays(new Date(), 20).toISOString(),
    profile: MOCK_PROFILES[3],
    is_away: false,
  },
];

export const MOCK_TASKS: Task[] = [
  {
    id: 'task-clean-hall',
    group_id: MOCK_GROUP_ID,
    name: 'Clean Hall',
    description: 'Sweep and mop the living hall, wipe down coffee table and organize shoes.',
    interval_type: 'days',
    interval_value: 3,
    is_active: true,
    created_at: subDays(new Date(), 20).toISOString(),
    rotation: [
      { id: 'rot-1', task_id: 'task-clean-hall', user_id: 'user-ahmed', position: 0, profile: MOCK_PROFILES[0] },
      { id: 'rot-2', task_id: 'task-clean-hall', user_id: 'user-rahul', position: 1, profile: MOCK_PROFILES[1] },
      { id: 'rot-3', task_id: 'task-clean-hall', user_id: 'user-sameer', position: 2, profile: MOCK_PROFILES[2] },
      { id: 'rot-4', task_id: 'task-clean-hall', user_id: 'user-usman', position: 3, profile: MOCK_PROFILES[3] },
    ],
    state: {
      task_id: 'task-clean-hall',
      current_rotation_position: 0,
      current_assignee_id: 'user-ahmed', // It is Ahmed's turn!
      last_completed_at: subDays(new Date(), 3).toISOString(),
      last_completed_by_id: 'user-usman',
      next_due_at: new Date().toISOString(), // Due today!
      next_reminder_at: new Date().toISOString(),
      is_paused: false,
      updated_at: subDays(new Date(), 3).toISOString(),
    },
    current_assignee: MOCK_PROFILES[0],
    active_exchange: null,
    recent_completions: [
      {
        id: 'comp-1',
        task_id: 'task-clean-hall',
        user_id: 'user-usman',
        completed_at: subDays(new Date(), 3).toISOString(),
        was_exchanged: false,
        profile: MOCK_PROFILES[3],
      },
      {
        id: 'comp-2',
        task_id: 'task-clean-hall',
        user_id: 'user-sameer',
        completed_at: subDays(new Date(), 6).toISOString(),
        was_exchanged: false,
        profile: MOCK_PROFILES[2],
      },
      {
        id: 'comp-3',
        task_id: 'task-clean-hall',
        user_id: 'user-rahul',
        completed_at: subDays(new Date(), 9).toISOString(),
        was_exchanged: false,
        profile: MOCK_PROFILES[1],
      },
    ],
  },
  {
    id: 'task-clean-bathroom',
    group_id: MOCK_GROUP_ID,
    name: 'Clean Bathroom',
    description: 'Scrub tiles, wash sink, clean mirror, replace hand towels and sanitize toilet.',
    interval_type: 'weeks',
    interval_value: 1,
    is_active: true,
    created_at: subDays(new Date(), 20).toISOString(),
    rotation: [
      { id: 'rot-b-1', task_id: 'task-clean-bathroom', user_id: 'user-sameer', position: 0, profile: MOCK_PROFILES[2] },
      { id: 'rot-b-2', task_id: 'task-clean-bathroom', user_id: 'user-usman', position: 1, profile: MOCK_PROFILES[3] },
      { id: 'rot-b-3', task_id: 'task-clean-bathroom', user_id: 'user-ahmed', position: 2, profile: MOCK_PROFILES[0] },
      { id: 'rot-b-4', task_id: 'task-clean-bathroom', user_id: 'user-rahul', position: 3, profile: MOCK_PROFILES[1] },
    ],
    state: {
      task_id: 'task-clean-bathroom',
      current_rotation_position: 1,
      current_assignee_id: 'user-usman',
      last_completed_at: subDays(new Date(), 6).toISOString(),
      last_completed_by_id: 'user-sameer',
      next_due_at: addDays(new Date(), 1).toISOString(), // Due tomorrow
      next_reminder_at: addDays(new Date(), 1).toISOString(),
      is_paused: false,
      updated_at: subDays(new Date(), 6).toISOString(),
    },
    current_assignee: MOCK_PROFILES[3],
    active_exchange: null,
    recent_completions: [
      {
        id: 'comp-b-1',
        task_id: 'task-clean-bathroom',
        user_id: 'user-sameer',
        completed_at: subDays(new Date(), 6).toISOString(),
        was_exchanged: false,
        profile: MOCK_PROFILES[2],
      },
    ],
  },
  {
    id: 'task-buy-groceries',
    group_id: MOCK_GROUP_ID,
    name: 'Buy Groceries',
    description: 'Restock milk, bread, cooking oil, spices, detergent, and trash bags.',
    interval_type: 'days',
    interval_value: 5,
    is_active: true,
    created_at: subDays(new Date(), 20).toISOString(),
    rotation: [
      { id: 'rot-g-1', task_id: 'task-buy-groceries', user_id: 'user-rahul', position: 0, profile: MOCK_PROFILES[1] },
      { id: 'rot-g-2', task_id: 'task-buy-groceries', user_id: 'user-ahmed', position: 1, profile: MOCK_PROFILES[0] },
      { id: 'rot-g-3', task_id: 'task-buy-groceries', user_id: 'user-usman', position: 2, profile: MOCK_PROFILES[3] },
      { id: 'rot-g-4', task_id: 'task-buy-groceries', user_id: 'user-sameer', position: 3, profile: MOCK_PROFILES[2] },
    ],
    state: {
      task_id: 'task-buy-groceries',
      current_rotation_position: 0,
      current_assignee_id: 'user-rahul',
      last_completed_at: subDays(new Date(), 3).toISOString(),
      last_completed_by_id: 'user-sameer',
      next_due_at: addDays(new Date(), 2).toISOString(), // Due in 2 days
      next_reminder_at: addDays(new Date(), 2).toISOString(),
      is_paused: false,
      updated_at: subDays(new Date(), 3).toISOString(),
    },
    current_assignee: MOCK_PROFILES[1],
    active_exchange: null,
    recent_completions: [],
  },
];
