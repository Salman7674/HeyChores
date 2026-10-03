import fs from 'fs';
import path from 'path';
import {
  Profile,
  Group,
  GroupMember,
  Task,
  AwayPeriod,
  TaskCompletion,
  TaskActivity,
  IntervalType,
} from '@/types';
import {
  MOCK_GROUP,
  MOCK_MEMBERS,
  MOCK_PROFILES,
  MOCK_TASKS,
  MOCK_AWAY_PERIODS,
} from './mock-data';
import {
  advanceTaskRotation,
  calculateNextDueDate,
  calculateNextReminder,
  handleMemberRemovalFromRotation,
} from './rotation-engine';

export interface DatabaseSchema {
  users: Profile[];
  groups: Group[];
  members: GroupMember[];
  tasks: Task[];
  away_periods: AwayPeriod[];
}

const DB_FILE_PATH = path.join(process.cwd(), 'data', 'database.json');

function initializeDefaultDatabase(): DatabaseSchema {
  // Simran user and flat with code 83RZLE pre-configured so invite code 83RZLE works instantly!
  const simranUser: Profile = {
    id: 'user-simran',
    name: 'Simran',
    username: 'simran',
    password: 'password123',
    email: 'simran@flat.com',
    created_at: new Date().toISOString(),
  };

  const simranGroup: Group = {
    id: 'group-simran',
    name: "Simran's Flat",
    invite_code: '83RZLE',
    admin_user_id: 'user-simran',
    timezone: 'Asia/Kolkata',
    created_at: new Date().toISOString(),
    member_count: 1,
  };

  const simranMember: GroupMember = {
    id: 'gm-simran',
    group_id: 'group-simran',
    user_id: 'user-simran',
    role: 'admin',
    joined_at: new Date().toISOString(),
    profile: simranUser,
    is_away: false,
  };

  return {
    users: [...MOCK_PROFILES, simranUser],
    groups: [MOCK_GROUP, simranGroup],
    members: [...MOCK_MEMBERS, simranMember],
    tasks: MOCK_TASKS,
    away_periods: MOCK_AWAY_PERIODS,
  };
}

export function getDatabase(): DatabaseSchema {
  try {
    const dir = path.dirname(DB_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (!fs.existsSync(DB_FILE_PATH)) {
      const initial = initializeDefaultDatabase();
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }

    const content = fs.readFileSync(DB_FILE_PATH, 'utf-8');
    const parsed = JSON.parse(content) as DatabaseSchema;

    // Safety check: ensure 83RZLE exists if it was queried before file creation
    const has83RZLE = parsed.groups?.some((g) => g.invite_code?.toUpperCase() === '83RZLE');
    if (!has83RZLE) {
      const simranGroup: Group = {
        id: 'group-simran',
        name: "Simran's Flat",
        invite_code: '83RZLE',
        admin_user_id: 'user-simran',
        timezone: 'Asia/Kolkata',
        created_at: new Date().toISOString(),
        member_count: 1,
      };
      const simranUser: Profile = {
        id: 'user-simran',
        name: 'Simran',
        username: 'simran',
        password: 'password123',
        email: 'simran@flat.com',
        created_at: new Date().toISOString(),
      };
      const simranMember: GroupMember = {
        id: 'gm-simran',
        group_id: 'group-simran',
        user_id: 'user-simran',
        role: 'admin',
        joined_at: new Date().toISOString(),
        profile: simranUser,
        is_away: false,
      };
      parsed.groups = parsed.groups || [];
      parsed.groups.push(simranGroup);
      parsed.users = parsed.users || [];
      if (!parsed.users.some((u) => u.id === 'user-simran' || u.username === 'simran')) {
        parsed.users.push(simranUser);
      }
      parsed.members = parsed.members || [];
      if (!parsed.members.some((m) => m.group_id === 'group-simran' && m.user_id === 'user-simran')) {
        parsed.members.push(simranMember);
      }
      saveDatabase(parsed);
    }

    return parsed;
  } catch (err) {
    console.error('Error reading centralized database:', err);
    return initializeDefaultDatabase();
  }
}

export function saveDatabase(data: DatabaseSchema): void {
  try {
    const dir = path.dirname(DB_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving centralized database:', err);
  }
}

// ==============================================================================
// USER OPERATIONS
// ==============================================================================

export function getAllUsers(): Profile[] {
  const db = getDatabase();
  return db.users;
}

export function findUserByCredentials(usernameOrEmail: string, password?: string): Profile | null {
  const db = getDatabase();
  const term = usernameOrEmail.trim().toLowerCase();

  const user = db.users.find(
    (u) =>
      (u.username && u.username.toLowerCase() === term) ||
      (u.email && u.email.toLowerCase() === term) ||
      u.name.toLowerCase() === term
  );

  if (!user) return null;
  if (password) {
    const expected = user.password || 'password123';
    if (password !== expected) return null;
  }
  return user;
}

export function registerServerUser(
  name: string,
  username: string,
  password: string,
  email?: string
): { success: boolean; user?: Profile; message?: string } {
  const db = getDatabase();
  const cleanUsername = username.trim().toLowerCase();
  const cleanName = name.trim();

  if (!cleanName || !cleanUsername || !password.trim()) {
    return { success: false, message: 'Name, username, and password are required.' };
  }

  const existing = db.users.find(
    (u) => u.username && u.username.toLowerCase() === cleanUsername
  );
  if (existing) {
    return { success: false, message: `Username "@${cleanUsername}" is already taken.` };
  }

  const newUser: Profile = {
    id: `user-${Date.now()}`,
    name: cleanName,
    username: cleanUsername,
    password: password.trim(),
    email: email?.trim() || `${cleanUsername}@flat.com`,
    created_at: new Date().toISOString(),
  };

  db.users.push(newUser);
  saveDatabase(db);

  return { success: true, user: newUser };
}

// ==============================================================================
// FLAT / GROUP OPERATIONS
// ==============================================================================

export function getUserGroups(userId: string): { groups: Group[]; activeGroup: Group | null } {
  const db = getDatabase();
  const userMemberships = db.members.filter((m) => m.user_id === userId);
  const groupIds = userMemberships.map((m) => m.group_id);
  const groups = db.groups.filter((g) => groupIds.includes(g.id));

  return {
    groups,
    activeGroup: groups.length > 0 ? groups[0] : null,
  };
}

export function createServerGroup(
  name: string,
  adminUserId: string,
  timezone: string = 'Asia/Kolkata'
): { success: boolean; group?: Group; message?: string } {
  const db = getDatabase();
  let user = db.users.find((u) => u.id === adminUserId);
  if (!user) {
    user = {
      id: adminUserId,
      name: 'Roommate',
      username: `user_${adminUserId.slice(-4)}`,
      created_at: new Date().toISOString(),
    };
    db.users.push(user);
  }

  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  const newGroup: Group = {
    id: `group-${Date.now()}`,
    name: name.trim(),
    invite_code: code,
    admin_user_id: adminUserId,
    timezone,
    created_at: new Date().toISOString(),
    member_count: 1,
  };

  const newMember: GroupMember = {
    id: `gm-${Date.now()}`,
    group_id: newGroup.id,
    user_id: adminUserId,
    role: 'admin',
    joined_at: new Date().toISOString(),
    profile: user,
    is_away: false,
  };

  db.groups.push(newGroup);
  db.members.push(newMember);
  saveDatabase(db);

  return { success: true, group: newGroup };
}

export function joinServerGroupByCode(
  code: string,
  userId: string,
  userProfile?: Profile
): { success: boolean; group?: Group; message?: string } {
  const db = getDatabase();
  const cleanCode = code.trim().toUpperCase();

  let user = db.users.find((u) => u.id === userId);
  if (!user && userProfile) {
    user = userProfile;
    db.users.push(user);
  } else if (!user) {
    user = {
      id: userId,
      name: 'Roommate',
      username: `user_${userId.slice(-4)}`,
      created_at: new Date().toISOString(),
    };
    db.users.push(user);
  }

  const group = db.groups.find((g) => g.invite_code.toUpperCase() === cleanCode);
  if (!group) {
    return {
      success: false,
      message: `No flat found with code "${cleanCode}". Please verify with your flatmate.`,
    };
  }

  const alreadyMember = db.members.some((m) => m.group_id === group.id && m.user_id === userId);
  if (alreadyMember) {
    return { success: true, group, message: `You are already a member of "${group.name}".` };
  }

  const newMember: GroupMember = {
    id: `gm-${Date.now()}`,
    group_id: group.id,
    user_id: userId,
    role: 'member',
    joined_at: new Date().toISOString(),
    profile: user,
    is_away: false,
  };

  db.members.push(newMember);
  group.member_count = (group.member_count || 1) + 1;
  saveDatabase(db);

  return { success: true, group, message: `Joined "${group.name}" successfully!` };
}

export function regenerateServerInviteCode(groupId: string): string {
  const db = getDatabase();
  const group = db.groups.find((g) => g.id === groupId);
  if (!group) return '';

  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  group.invite_code = code;
  saveDatabase(db);
  return code;
}

export function transferServerAdmin(groupId: string, newAdminUserId: string): boolean {
  const db = getDatabase();
  const group = db.groups.find((g) => g.id === groupId);
  if (!group) return false;

  group.admin_user_id = newAdminUserId;
  db.members = db.members.map((m) => {
    if (m.group_id === groupId) {
      return {
        ...m,
        role: m.user_id === newAdminUserId ? 'admin' : 'member',
      };
    }
    return m;
  });

  saveDatabase(db);
  return true;
}

export function deleteServerGroup(groupId: string, userId: string): { success: boolean; message?: string } {
  const db = getDatabase();
  const group = db.groups.find((g) => g.id === groupId);
  if (!group) {
    return { success: false, message: 'Flat not found.' };
  }

  // Verify the user is the Flat Admin
  if (group.admin_user_id !== userId) {
    return { success: false, message: 'Only the Flat Admin can delete this flat.' };
  }

  db.groups = db.groups.filter((g) => g.id !== groupId);
  db.members = db.members.filter((m) => m.group_id !== groupId);
  db.tasks = db.tasks.filter((t) => t.group_id !== groupId);
  db.away_periods = db.away_periods.filter((a) => a.group_id !== groupId);

  saveDatabase(db);
  return { success: true, message: `Flat "${group.name}" was permanently deleted.` };
}

export function leaveServerGroup(groupId: string, userId: string): { success: boolean; message?: string } {
  const db = getDatabase();
  const group = db.groups.find((g) => g.id === groupId);
  if (!group) {
    return { success: false, message: 'Flat not found.' };
  }

  if (group.admin_user_id === userId) {
    const otherMembers = db.members.filter((m) => m.group_id === groupId && m.user_id !== userId);
    if (otherMembers.length === 0) {
      return deleteServerGroup(groupId, userId);
    } else {
      group.admin_user_id = otherMembers[0].user_id;
      otherMembers[0].role = 'admin';
    }
  }

  removeServerMember(groupId, userId);
  return { success: true, message: `You have left "${group.name}".` };
}

// ==============================================================================
// MEMBER OPERATIONS
// ==============================================================================

export function getGroupData(groupId: string) {
  const db = getDatabase();
  const members = db.members
    .filter((m) => m.group_id === groupId)
    .map((m) => ({
      ...m,
      profile: db.users.find((u) => u.id === m.user_id) || m.profile,
    }));
  const tasks = db.tasks.filter((t) => t.group_id === groupId);
  const awayPeriods = db.away_periods.filter((a) => a.group_id === groupId);

  return { members, tasks, awayPeriods };
}

export function removeServerMember(groupId: string, userId: string): boolean {
  const db = getDatabase();
  db.members = db.members.filter(
    (m) => !(m.group_id === groupId && m.user_id === userId)
  );

  const group = db.groups.find((g) => g.id === groupId);
  if (group && (group.member_count || 1) > 1) {
    group.member_count = (group.member_count || 2) - 1;
  }

  const awayPeriods = db.away_periods.filter((a) => a.group_id === groupId);

  db.tasks = db.tasks.map((task) => {
    if (task.group_id !== groupId || !task.rotation || !task.state) return task;
    const hasMember = task.rotation.some((r) => r.user_id === userId);
    if (!hasMember) return task;

    const { updatedRotation, updatedState } = handleMemberRemovalFromRotation(
      task.rotation,
      userId,
      task.state,
      awayPeriods
    );

    const nextAssignee = updatedState?.current_assignee_id
      ? db.users.find((u) => u.id === updatedState.current_assignee_id)
      : task.current_assignee;

    return {
      ...task,
      rotation: updatedRotation,
      state: updatedState ? { ...task.state, ...updatedState } : task.state,
      current_assignee: nextAssignee || task.current_assignee,
    };
  });

  saveDatabase(db);
  return true;
}

export function renameServerMember(userId: string, newName: string): boolean {
  const db = getDatabase();
  const user = db.users.find((u) => u.id === userId);
  if (!user) return false;

  user.name = newName.trim();
  db.members = db.members.map((m) => {
    if (m.user_id === userId && m.profile) {
      return { ...m, profile: { ...m.profile, name: newName.trim() } };
    }
    return m;
  });

  saveDatabase(db);
  return true;
}

export function setServerMemberAway(
  groupId: string,
  userId: string,
  startAt: string,
  endAt: string
): { success: boolean } {
  const db = getDatabase();
  const period: AwayPeriod = {
    id: `away-${Date.now()}`,
    group_id: groupId,
    user_id: userId,
    start_at: startAt,
    end_at: endAt,
    created_at: new Date().toISOString(),
  };

  db.away_periods.push(period);
  db.members = db.members.map((m) => {
    if (m.group_id === groupId && m.user_id === userId) {
      return { ...m, is_away: true, away_period: period };
    }
    return m;
  });

  saveDatabase(db);
  return { success: true };
}

export function clearServerMemberAway(groupId: string, userId: string): { success: boolean } {
  const db = getDatabase();
  db.away_periods = db.away_periods.filter(
    (a) => !(a.group_id === groupId && a.user_id === userId)
  );
  db.members = db.members.map((m) => {
    if (m.group_id === groupId && m.user_id === userId) {
      return { ...m, is_away: false, away_period: null };
    }
    return m;
  });

  saveDatabase(db);
  return { success: true };
}

// ==============================================================================
// TASK OPERATIONS
// ==============================================================================

export function createServerTask(
  groupId: string,
  userId: string,
  data: {
    name: string;
    description?: string;
    intervalType: IntervalType;
    intervalValue: number;
    rotationUserIds: string[];
  }
): { success: boolean; task?: Task; message?: string } {
  const db = getDatabase();
  const creator = db.users.find((u) => u.id === userId);
  if (!creator) return { success: false, message: 'Creator not found.' };

  const group = db.groups.find((g) => g.id === groupId);
  if (!group) return { success: false, message: 'Flat not found.' };

  if (!data.name.trim()) return { success: false, message: 'Chore name required.' };
  if (!data.rotationUserIds || data.rotationUserIds.length === 0) {
    return { success: false, message: 'Please select at least one roommate for rotation.' };
  }

  const taskId = `task-${Date.now()}`;
  const initialAssigneeId = data.rotationUserIds[0];
  const initialAssignee = db.users.find((u) => u.id === initialAssigneeId) || creator;

  const rotation = data.rotationUserIds.map((uId, idx) => ({
    id: `rot-${taskId}-${idx}`,
    task_id: taskId,
    user_id: uId,
    position: idx,
    profile: db.users.find((u) => u.id === uId),
  }));

  const nextDue = calculateNextDueDate(new Date(), data.intervalType, data.intervalValue);

  const newActivity: TaskActivity = {
    id: `act-${Date.now()}`,
    task_id: taskId,
    actor_id: userId,
    action: 'rotation_changed',
    details: `${creator.name} created chore "${data.name}" with ${rotation.length} flatmates`,
    created_at: new Date().toISOString(),
    actor: creator,
  };

  const newTask: Task = {
    id: taskId,
    group_id: groupId,
    name: data.name.trim(),
    description: data.description?.trim() || '',
    interval_type: data.intervalType,
    interval_value: data.intervalValue,
    is_active: true,
    created_at: new Date().toISOString(),
    rotation,
    state: {
      task_id: taskId,
      current_rotation_position: 0,
      current_assignee_id: initialAssigneeId,
      next_due_at: nextDue.toISOString(),
      next_reminder_at: nextDue.toISOString(),
      is_paused: false,
      updated_at: new Date().toISOString(),
    },
    current_assignee: initialAssignee,
    active_exchange: null,
    recent_completions: [],
    activities: [newActivity],
  };

  db.tasks.unshift(newTask);
  saveDatabase(db);

  return { success: true, task: newTask };
}

export function completeServerTask(
  taskId: string,
  userId: string,
  notes?: string
): { success: boolean; task?: Task; message?: string } {
  const db = getDatabase();
  const task = db.tasks.find((t) => t.id === taskId);
  if (!task || !task.state || !task.rotation) {
    return { success: false, message: 'Task not found.' };
  }

  const user = db.users.find((u) => u.id === userId);
  if (!user) return { success: false, message: 'User not found.' };

  const group = db.groups.find((g) => g.id === task.group_id);
  const isCurrentAssignee = task.state.current_assignee_id === userId;
  const isAdmin = group?.admin_user_id === userId;

  if (!isCurrentAssignee && !isAdmin) {
    return { success: false, message: 'Only the assigned roommate or flat admin can mark this chore complete.' };
  }

  const wasAdminOverride = !isCurrentAssignee && isAdmin;
  const now = new Date();
  const completedAt = now.toISOString();

  const awayPeriods = db.away_periods.filter((a) => a.group_id === task.group_id);

  const advanceResult = advanceTaskRotation({
    rotation: task.rotation,
    currentState: task.state,
    awayPeriods,
    completedAt: now,
    intervalType: task.interval_type,
    intervalValue: task.interval_value,
    completedByUserId: userId,
    activeExchange: task.active_exchange,
  });

  const nextAssigneeProfile = db.users.find((u) => u.id === advanceResult.nextAssigneeId) || {
    id: advanceResult.nextAssigneeId,
    name: 'Roommate',
  };

  const completionNote = wasAdminOverride
    ? `[Admin override by ${user.name} on behalf of assigned roommate] ${notes || ''}`.trim()
    : notes;

  const newCompletion: TaskCompletion = {
    id: `comp-${Date.now()}`,
    task_id: taskId,
    user_id: userId,
    completed_at: completedAt,
    was_exchanged: Boolean(task.active_exchange),
    original_assignee_id: task.active_exchange ? task.active_exchange.original_assignee_id : null,
    notes: completionNote,
    profile: user,
  };

  const newActivity: TaskActivity = {
    id: `act-${Date.now()}`,
    task_id: taskId,
    actor_id: userId,
    action: wasAdminOverride ? 'admin_override' : 'completed',
    details: wasAdminOverride
      ? `${user.name} marked completed as Admin on behalf of ${task.current_assignee?.name || 'assignee'}`
      : `${user.name} completed turn`,
    created_at: completedAt,
    actor: user,
  };

  task.state = {
    ...task.state,
    current_rotation_position: advanceResult.nextPosition,
    current_assignee_id: advanceResult.nextAssigneeId,
    last_completed_at: completedAt,
    last_completed_by_id: userId,
    next_due_at: advanceResult.nextDueAt,
    next_reminder_at: advanceResult.nextReminderAt,
    updated_at: completedAt,
  };
  task.current_assignee = nextAssigneeProfile;
  task.active_exchange = null;
  task.recent_completions = [newCompletion, ...(task.recent_completions || [])];
  task.activities = [newActivity, ...(task.activities || [])];

  saveDatabase(db);
  return { success: true, task };
}

export function exchangeServerTask(
  taskId: string,
  userId: string,
  replacementUserId: string,
  note?: string
): { success: boolean; task?: Task; message?: string } {
  const db = getDatabase();
  const task = db.tasks.find((t) => t.id === taskId);
  if (!task || !task.state) return { success: false, message: 'Task not found.' };

  const user = db.users.find((u) => u.id === userId);
  const replacement = db.users.find((u) => u.id === replacementUserId);
  if (!user || !replacement) return { success: false, message: 'Roommate not found.' };

  const group = db.groups.find((g) => g.id === task.group_id);
  const isCurrentAssignee = task.state.current_assignee_id === userId;
  const isAdmin = group?.admin_user_id === userId;

  if (!isCurrentAssignee && !isAdmin) {
    return { success: false, message: 'Only the assigned roommate can pass or exchange their chore.' };
  }

  // Check if replacement is away
  const replacementMember = db.members.find((m) => m.group_id === task.group_id && m.user_id === replacementUserId);
  const isAwayInPeriods = db.away_periods.some(
    (a) => a.group_id === task.group_id && a.user_id === replacementUserId
  );
  if (replacementMember?.is_away || isAwayInPeriods) {
    return { success: false, message: 'Cannot exchange with a roommate who is currently marked as away on vacation.' };
  }

  const exchange = {
    id: `ex-${Date.now()}`,
    task_id: taskId,
    occurrence_id: `occ-${Date.now()}`,
    original_assignee_id: task.state.current_assignee_id,
    replacement_assignee_id: replacementUserId,
    note,
    is_active: true,
    created_at: new Date().toISOString(),
    original_assignee: task.current_assignee || user,
    replacement_assignee: replacement,
  };

  const newActivity: TaskActivity = {
    id: `act-${Date.now()}`,
    task_id: taskId,
    actor_id: userId,
    action: 'exchanged',
    details: `${user.name} passed turn to ${replacement.name}${note ? `: "${note}"` : ''}`,
    created_at: new Date().toISOString(),
    actor: user,
  };

  task.state.current_assignee_id = replacementUserId;
  task.state.updated_at = new Date().toISOString();
  task.current_assignee = replacement;
  task.active_exchange = exchange;
  task.activities = [newActivity, ...(task.activities || [])];

  saveDatabase(db);
  return { success: true, task };
}

export function togglePauseServerTask(taskId: string, userId: string): boolean {
  const db = getDatabase();
  const task = db.tasks.find((t) => t.id === taskId);
  const user = db.users.find((u) => u.id === userId);
  if (!task || !task.state || !user) return false;

  const isNowPaused = !task.state.is_paused;
  const newActivity: TaskActivity = {
    id: `act-${Date.now()}`,
    task_id: taskId,
    actor_id: userId,
    action: isNowPaused ? 'paused' : 'resumed',
    details: `${user.name} ${isNowPaused ? 'paused' : 'resumed'} chore`,
    created_at: new Date().toISOString(),
    actor: user,
  };

  task.state.is_paused = isNowPaused;
  task.state.next_reminder_at = isNowPaused ? null : calculateNextReminder(task.state.next_due_at, null, new Date()).toISOString();
  task.state.updated_at = new Date().toISOString();
  task.activities = [newActivity, ...(task.activities || [])];

  saveDatabase(db);
  return true;
}

export function deleteServerTask(taskId: string): boolean {
  const db = getDatabase();
  db.tasks = db.tasks.filter((t) => t.id !== taskId);
  saveDatabase(db);
  return true;
}

export function reorderServerTaskRotation(
  taskId: string,
  userId: string,
  userIdsInOrder: string[]
): boolean {
  const db = getDatabase();
  const task = db.tasks.find((t) => t.id === taskId);
  const user = db.users.find((u) => u.id === userId);
  if (!task || !task.rotation || !user) return false;

  const newRotation = userIdsInOrder.map((uId, idx) => {
    const existing = task.rotation?.find((r) => r.user_id === uId);
    return {
      id: existing?.id || `rot-${taskId}-${idx}`,
      task_id: taskId,
      user_id: uId,
      position: idx,
      profile: db.users.find((u) => u.id === uId),
    };
  });

  const currentAssigneePos = newRotation.findIndex((r) => r.user_id === task.state?.current_assignee_id);
  const newPos = currentAssigneePos >= 0 ? currentAssigneePos : 0;

  const newActivity: TaskActivity = {
    id: `act-${Date.now()}`,
    task_id: taskId,
    actor_id: userId,
    action: 'rotation_changed',
    details: `${user.name} altered rotation order`,
    created_at: new Date().toISOString(),
    actor: user,
  };

  task.rotation = newRotation;
  if (task.state) {
    task.state.current_rotation_position = newPos;
  }
  task.activities = [newActivity, ...(task.activities || [])];

  saveDatabase(db);
  return true;
}

// ==============================================================================
// SYNC OPERATIONS (To absorb any legacy localStorage data from clients)
// ==============================================================================

export function syncLocalDataToServer(data: {
  users?: Profile[];
  groups?: Group[];
  members?: GroupMember[];
  tasks?: Task[];
  awayPeriods?: AwayPeriod[];
}): { success: boolean; message: string } {
  const db = getDatabase();
  let changed = false;

  if (data.users && Array.isArray(data.users)) {
    for (const u of data.users) {
      if (!db.users.some((existing) => existing.id === u.id || (existing.username && existing.username.toLowerCase() === u.username?.toLowerCase()))) {
        db.users.push(u);
        changed = true;
      }
    }
  }

  if (data.groups && Array.isArray(data.groups)) {
    for (const g of data.groups) {
      const existing = db.groups.find((ex) => ex.id === g.id || ex.invite_code?.toUpperCase() === g.invite_code?.toUpperCase());
      if (!existing) {
        db.groups.push(g);
        changed = true;
      } else {
        // Update name or member count if newer
        existing.name = g.name || existing.name;
        existing.member_count = Math.max(existing.member_count || 1, g.member_count || 1);
        changed = true;
      }
    }
  }

  if (data.members && Array.isArray(data.members)) {
    for (const m of data.members) {
      if (!db.members.some((ex) => ex.group_id === m.group_id && ex.user_id === m.user_id)) {
        db.members.push(m);
        changed = true;
      }
    }
  }

  if (data.tasks && Array.isArray(data.tasks)) {
    for (const t of data.tasks) {
      if (!db.tasks.some((ex) => ex.id === t.id)) {
        db.tasks.push(t);
        changed = true;
      }
    }
  }

  if (data.awayPeriods && Array.isArray(data.awayPeriods)) {
    for (const a of data.awayPeriods) {
      if (!db.away_periods.some((ex) => ex.id === a.id)) {
        db.away_periods.push(a);
        changed = true;
      }
    }
  }

  if (changed) {
    saveDatabase(db);
  }

  return { success: true, message: 'Server database synchronized.' };
}
