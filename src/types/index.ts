export type IntervalType = 'days' | 'weeks' | 'months';

export type UserRole = 'admin' | 'member';

export interface Profile {
  id: string;
  name: string;
  username?: string;
  avatar_url?: string | null;
  created_at?: string;
  email?: string;
  password?: string;
}

export interface Group {
  id: string;
  name: string;
  invite_code: string;
  admin_user_id: string;
  timezone: string;
  created_at: string;
  member_count?: number;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: UserRole;
  display_name?: string;
  joined_at: string;
  profile?: Profile;
  is_away?: boolean;
  away_period?: AwayPeriod | null;
}

export interface AwayPeriod {
  id: string;
  group_id: string;
  user_id: string;
  start_at: string; // ISO UTC
  end_at: string;   // ISO UTC
  created_at?: string;
}

export interface TaskRotationMember {
  id: string;
  task_id: string;
  user_id: string;
  position: number; // 0, 1, 2, ...
  profile?: Profile;
}

export interface TaskState {
  task_id: string;
  current_rotation_position: number;
  current_assignee_id: string;
  last_completed_at?: string | null;
  last_completed_by_id?: string | null;
  next_due_at: string;
  next_reminder_at?: string | null;
  last_reminded_at?: string | null;
  is_paused: boolean;
  updated_at: string;
}

export interface TurnExchange {
  id: string;
  task_id: string;
  occurrence_id: string; // unique ID or timestamp representing this turn
  original_assignee_id: string;
  replacement_assignee_id: string;
  note?: string;
  is_active: boolean;
  created_at: string;
  original_assignee?: Profile;
  replacement_assignee?: Profile;
}

export interface TaskCompletion {
  id: string;
  task_id: string;
  user_id: string;
  completed_at: string;
  was_exchanged: boolean;
  original_assignee_id?: string | null;
  notes?: string;
  profile?: Profile;
}

export interface TaskActivity {
  id: string;
  task_id: string;
  actor_id: string;
  action: 'completed' | 'exchanged' | 'admin_override' | 'paused' | 'resumed' | 'rotation_changed';
  details: string;
  created_at: string;
  actor?: Profile;
}

export interface Task {
  id: string;
  group_id: string;
  name: string;
  description?: string | null;
  interval_type: IntervalType;
  interval_value: number; // e.g., 3 for every 3 days, 1 for every week, 2 for every 2 weeks
  is_active: boolean;
  created_at: string;
  
  // Relations / Computed
  rotation?: TaskRotationMember[];
  state?: TaskState;
  current_assignee?: Profile;
  active_exchange?: TurnExchange | null;
  recent_completions?: TaskCompletion[];
  activities?: TaskActivity[];
}

export interface InAppNotification {
  id: string;
  user_id: string;
  group_id: string;
  task_id?: string;
  title: string;
  message: string;
  type: 'due' | 'reminder' | 'exchange' | 'completed' | 'admin';
  is_read: boolean;
  created_at: string;
}

export interface NotificationSubscription {
  id: string;
  user_id: string;
  subscription_data: PushSubscriptionJSON;
  browser?: string;
  created_at: string;
}
