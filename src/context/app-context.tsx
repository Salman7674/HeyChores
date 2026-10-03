'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Group,
  GroupMember,
  Task,
  Profile,
  AwayPeriod,
  TaskCompletion,
  TaskActivity,
  InAppNotification,
  IntervalType,
} from '@/types';
import {
  MOCK_GROUP,
  MOCK_MEMBERS,
  MOCK_PROFILES,
  MOCK_TASKS,
  MOCK_AWAY_PERIODS,
} from '@/lib/mock-data';
import {
  advanceTaskRotation,
  handleMemberRemovalFromRotation,
  calculateNextDueDate,
  calculateNextReminder,
} from '@/lib/rotation-engine';
import { isSupabaseConfigured, createClient } from '@/lib/supabase/client';
import confetti from 'canvas-confetti';

interface AppContextType {
  currentUser: Profile | null;
  isAuthenticated: boolean;
  allUsers: Profile[];
  groups: Group[];
  activeGroup: Group | null;
  members: GroupMember[];
  tasks: Task[];
  awayPeriods: AwayPeriod[];
  notifications: InAppNotification[];
  isSupabaseMode: boolean;
  isLoading: boolean;
  loginWithCredentials: (usernameOrEmail: string, password: string) => Promise<{ success: boolean; message?: string }>;
  registerUser: (name: string, username: string, password: string, email?: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  setActiveGroup: (group: Group) => void;
  markTaskCompleted: (taskId: string, notes?: string) => Promise<{ success: boolean; message?: string }>;
  exchangeTurn: (taskId: string, replacementUserId: string, note?: string) => Promise<{ success: boolean; message?: string }>;
  setMemberAway: (userId: string, startAt: string, endAt: string) => Promise<boolean>;
  clearMemberAway: (awayId: string) => Promise<boolean>;
  createTask: (data: {
    name: string;
    description?: string;
    intervalType: IntervalType;
    intervalValue: number;
    rotationUserIds: string[];
  }) => Promise<{ success: boolean; message?: string }>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<boolean>;
  togglePauseTask: (taskId: string) => Promise<boolean>;
  deleteTask: (taskId: string) => Promise<boolean>;
  reorderTaskRotation: (taskId: string, userIdsInOrder: string[]) => Promise<boolean>;
  removeMemberFromGroup: (userId: string) => Promise<boolean>;
  transferAdmin: (newAdminUserId: string) => Promise<boolean>;
  renameMember: (userId: string, newName: string) => Promise<boolean>;
  regenerateInviteCode: () => Promise<string>;
  createGroup: (name: string, timezone?: string) => Promise<Group>;
  joinGroupByCode: (code: string) => Promise<{ success: boolean; message?: string }>;
  markNotificationRead: (id: string) => void;
  clearAllNotifications: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isSupabaseMode] = useState<boolean>(() => isSupabaseConfigured());
  const [allUsers, setAllUsers] = useState<Profile[]>(MOCK_PROFILES);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [groups, setGroups] = useState<Group[]>([MOCK_GROUP]);
  const [activeGroup, setActiveGroup] = useState<Group | null>(MOCK_GROUP);
  const [members, setMembers] = useState<GroupMember[]>(MOCK_MEMBERS);
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
  const [awayPeriods, setAwayPeriods] = useState<AwayPeriod[]>(MOCK_AWAY_PERIODS);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize Auth & Storage
  useEffect(() => {
    async function initAuth() {
      if (isSupabaseMode) {
        try {
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            setCurrentUser({
              id: user.id,
              name: user.user_metadata?.name || user.email?.split('@')[0] || 'Roommate',
              username: user.user_metadata?.username || user.email?.split('@')[0],
              email: user.email,
              avatar_url: user.user_metadata?.avatar_url,
            });
          }
        } catch (err) {
          console.error('Supabase user check error:', err);
        }
      } else {
        // In local mode, check localStorage for registered accounts and logged-in user
        try {
          let usersList = MOCK_PROFILES;
          const savedUsers = localStorage.getItem('heychores_users');
          if (savedUsers) {
            usersList = JSON.parse(savedUsers);
            setAllUsers(usersList);
          } else {
            localStorage.setItem('heychores_users', JSON.stringify(MOCK_PROFILES));
          }

          const savedUserId = localStorage.getItem('heychores_current_user_id');
          if (savedUserId) {
            const found = usersList.find((p) => p.id === savedUserId);
            if (found) setCurrentUser(found);
            else setCurrentUser(usersList[0]);
          } else {
            // Default logged in as Ahmed for instant initial visit
            setCurrentUser(usersList[0]);
            localStorage.setItem('heychores_current_user_id', usersList[0].id);
          }

          const savedTasks = localStorage.getItem('heychores_tasks');
          if (savedTasks) setTasks(JSON.parse(savedTasks));

          const savedMembers = localStorage.getItem('heychores_members');
          if (savedMembers) setMembers(JSON.parse(savedMembers));

          const savedAway = localStorage.getItem('heychores_away');
          if (savedAway) setAwayPeriods(JSON.parse(savedAway));

          const savedGroups = localStorage.getItem('heychores_groups');
          if (savedGroups) {
            const parsed = JSON.parse(savedGroups);
            setGroups(parsed);
            if (parsed.length > 0) setActiveGroup(parsed[0]);
          }
        } catch (e) {
          console.warn('LocalStorage error:', e);
          setCurrentUser(MOCK_PROFILES[0]);
        }
      }
      setIsLoading(false);
    }

    initAuth();
  }, [isSupabaseMode]);

  const persistState = (newTasks?: Task[], newMembers?: GroupMember[], newAway?: AwayPeriod[], newGroups?: Group[]) => {
    if (!isSupabaseMode) {
      if (newTasks) {
        setTasks(newTasks);
        localStorage.setItem('heychores_tasks', JSON.stringify(newTasks));
      }
      if (newMembers) {
        setMembers(newMembers);
        localStorage.setItem('heychores_members', JSON.stringify(newMembers));
      }
      if (newAway) {
        setAwayPeriods(newAway);
        localStorage.setItem('heychores_away', JSON.stringify(newAway));
      }
      if (newGroups) {
        setGroups(newGroups);
        localStorage.setItem('heychores_groups', JSON.stringify(newGroups));
      }
    }
  };

  /**
   * Log in using Username (or Email) and Password
   */
  const loginWithCredentials = async (
    usernameOrEmail: string,
    password: string
  ): Promise<{ success: boolean; message?: string }> => {
    const term = usernameOrEmail.trim().toLowerCase();

    if (!term || !password.trim()) {
      return { success: false, message: 'Please enter both username and password.' };
    }

    if (isSupabaseMode) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.auth.signInWithPassword({
          email: term,
          password,
        });
        if (error) {
          return { success: false, message: error.message };
        }
        if (data.user) {
          const profile: Profile = {
            id: data.user.id,
            name: data.user.user_metadata?.name || term,
            username: term,
            email: data.user.email,
          };
          setCurrentUser(profile);
          return { success: true };
        }
      } catch (err: any) {
        return { success: false, message: err.message || 'Login failed' };
      }
    }

    // Local / Offline authentication
    const user = allUsers.find(
      (u) =>
        (u.username && u.username.toLowerCase() === term) ||
        (u.email && u.email.toLowerCase() === term) ||
        u.name.toLowerCase() === term
    );

    if (!user) {
      return { success: false, message: 'No account found with that username or email.' };
    }

    // Validate password (default to password123 if not set)
    const expectedPassword = user.password || 'password123';
    if (password !== expectedPassword) {
      return { success: false, message: 'Incorrect password. (Default is password123)' };
    }

    setCurrentUser(user);
    localStorage.setItem('heychores_current_user_id', user.id);
    return { success: true };
  };

  /**
   * Register a new account with Username & Password
   */
  const registerUser = async (
    name: string,
    username: string,
    password: string,
    email?: string
  ): Promise<{ success: boolean; message?: string }> => {
    const cleanUsername = username.trim().toLowerCase();
    const cleanName = name.trim();

    if (!cleanName || !cleanUsername || !password.trim()) {
      return { success: false, message: 'Name, username, and password are required.' };
    }

    // Check if username taken
    const existing = allUsers.find(
      (u) => u.username && u.username.toLowerCase() === cleanUsername
    );
    if (existing) {
      return { success: false, message: `Username "@${cleanUsername}" is already taken. Please choose another.` };
    }

    const newUser: Profile = {
      id: `user-${Date.now()}`,
      name: cleanName,
      username: cleanUsername,
      password: password.trim(),
      email: email?.trim() || `${cleanUsername}@flat.com`,
      created_at: new Date().toISOString(),
    };

    const updatedUsers = [...allUsers, newUser];
    setAllUsers(updatedUsers);
    localStorage.setItem('heychores_users', JSON.stringify(updatedUsers));

    setCurrentUser(newUser);
    localStorage.setItem('heychores_current_user_id', newUser.id);

    return { success: true };
  };

  const logout = async () => {
    if (isSupabaseMode) {
      const supabase = createClient();
      await supabase.auth.signOut();
    } else {
      localStorage.removeItem('heychores_current_user_id');
    }
    setCurrentUser(null);
  };

  /**
   * Completes a task turn atomically.
   * STRICT AUTHORIZATION:
   * Only the current responsible person (or flat Admin with audit logging) can complete it!
   */
  const markTaskCompleted = async (
    taskId: string,
    notes?: string
  ): Promise<{ success: boolean; message?: string }> => {
    if (!currentUser) {
      return { success: false, message: 'You must be logged in to complete a chore.' };
    }

    const targetTask = tasks.find((t) => t.id === taskId);
    if (!targetTask || !targetTask.state || !targetTask.rotation || targetTask.rotation.length === 0) {
      return { success: false, message: 'Task not found.' };
    }

    const isCurrentAssignee = targetTask.state.current_assignee_id === currentUser.id;
    const isAdmin = activeGroup?.admin_user_id === currentUser.id;

    if (!isCurrentAssignee && !isAdmin) {
      return {
        success: false,
        message: 'Only the assigned roommate or flat admin can mark this chore complete.',
      };
    }

    const wasAdminOverride = !isCurrentAssignee && isAdmin;
    const now = new Date();
    const completedAt = now.toISOString();

    // Trigger celebration confetti
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.7 },
        colors: ['#0d9488', '#14b8a6', '#f59e0b', '#38bdf8', '#8b5cf6'],
      });
    } catch {
      // ignore
    }

    // Advance rotation logic
    const advanceResult = advanceTaskRotation({
      rotation: targetTask.rotation,
      currentState: targetTask.state,
      awayPeriods,
      completedAt: now,
      intervalType: targetTask.interval_type,
      intervalValue: targetTask.interval_value,
      completedByUserId: currentUser.id,
      activeExchange: targetTask.active_exchange,
    });

    const nextAssigneeProfile = members.find((m) => m.user_id === advanceResult.nextAssigneeId)?.profile ||
      allUsers.find((p) => p.id === advanceResult.nextAssigneeId) || {
        id: advanceResult.nextAssigneeId,
        name: 'Roommate',
      };

    const completionNote = wasAdminOverride
      ? `[Admin override by ${currentUser.name} on behalf of assigned roommate] ${notes || ''}`.trim()
      : notes;

    const newCompletion: TaskCompletion = {
      id: `comp-${Date.now()}`,
      task_id: taskId,
      user_id: currentUser.id,
      completed_at: completedAt,
      was_exchanged: Boolean(targetTask.active_exchange),
      original_assignee_id: targetTask.active_exchange ? targetTask.active_exchange.original_assignee_id : null,
      notes: completionNote,
      profile: currentUser,
    };

    const newActivity: TaskActivity = {
      id: `act-${Date.now()}`,
      task_id: taskId,
      actor_id: currentUser.id,
      action: wasAdminOverride ? 'admin_override' : 'completed',
      details: wasAdminOverride
        ? `${currentUser.name} marked completed as Admin on behalf of ${targetTask.current_assignee?.name || 'assignee'}`
        : `${currentUser.name} completed turn`,
      created_at: completedAt,
      actor: currentUser,
    };

    const updatedTask: Task = {
      ...targetTask,
      state: {
        ...targetTask.state,
        current_rotation_position: advanceResult.nextPosition,
        current_assignee_id: advanceResult.nextAssigneeId,
        last_completed_at: completedAt,
        last_completed_by_id: currentUser.id,
        next_due_at: advanceResult.nextDueAt,
        next_reminder_at: advanceResult.nextReminderAt,
        updated_at: completedAt,
      },
      current_assignee: nextAssigneeProfile,
      active_exchange: null,
      recent_completions: [newCompletion, ...(targetTask.recent_completions || [])],
      activities: [newActivity, ...(targetTask.activities || [])],
    };

    const newTasks = tasks.map((t) => (t.id === taskId ? updatedTask : t));
    persistState(newTasks);

    return { success: true };
  };

  /**
   * Temporarily exchanges turn with another roommate.
   * STRICT RULES:
   * 1. Cannot exchange with a person who is marked away!
   * 2. Only the assigned roommate (or admin) can initiate an exchange.
   * 3. An activity log is recorded in history.
   */
  const exchangeTurn = async (
    taskId: string,
    replacementUserId: string,
    note?: string
  ): Promise<{ success: boolean; message?: string }> => {
    if (!currentUser) {
      return { success: false, message: 'You must be logged in to exchange turns.' };
    }

    const targetTask = tasks.find((t) => t.id === taskId);
    if (!targetTask || !targetTask.state) {
      return { success: false, message: 'Task not found.' };
    }

    const isCurrentAssignee = targetTask.state.current_assignee_id === currentUser.id;
    const isAdmin = activeGroup?.admin_user_id === currentUser.id;

    if (!isCurrentAssignee && !isAdmin) {
      return {
        success: false,
        message: 'Only the assigned roommate can pass or exchange their chore.',
      };
    }

    // CHECK: Is the replacement user marked away?
    const replacementMember = members.find((m) => m.user_id === replacementUserId);
    if (replacementMember?.is_away) {
      return {
        success: false,
        message: 'Cannot exchange with a roommate who is currently marked as away on vacation.',
      };
    }

    const replacementProfile = replacementMember?.profile || allUsers.find((p) => p.id === replacementUserId);
    if (!replacementProfile) {
      return { success: false, message: 'Replacement roommate not found.' };
    }

    const exchange = {
      id: `ex-${Date.now()}`,
      task_id: taskId,
      occurrence_id: `occ-${Date.now()}`,
      original_assignee_id: targetTask.state.current_assignee_id,
      replacement_assignee_id: replacementUserId,
      note,
      is_active: true,
      created_at: new Date().toISOString(),
      original_assignee: targetTask.current_assignee || currentUser,
      replacement_assignee: replacementProfile,
    };

    const newActivity: TaskActivity = {
      id: `act-${Date.now()}`,
      task_id: taskId,
      actor_id: currentUser.id,
      action: 'exchanged',
      details: `${currentUser.name} passed turn to ${replacementProfile.name}${note ? `: "${note}"` : ''}`,
      created_at: new Date().toISOString(),
      actor: currentUser,
    };

    const updatedTask: Task = {
      ...targetTask,
      state: {
        ...targetTask.state,
        current_assignee_id: replacementUserId,
        updated_at: new Date().toISOString(),
      },
      current_assignee: replacementProfile,
      active_exchange: exchange,
      activities: [newActivity, ...(targetTask.activities || [])],
    };

    const newTasks = tasks.map((t) => (t.id === taskId ? updatedTask : t));
    persistState(newTasks);

    return { success: true };
  };

  /**
   * Sets away period for a roommate.
   */
  const setMemberAway = async (userId: string, startAt: string, endAt: string): Promise<boolean> => {
    const newPeriod: AwayPeriod = {
      id: `away-${Date.now()}`,
      group_id: activeGroup?.id || '',
      user_id: userId,
      start_at: startAt,
      end_at: endAt,
      created_at: new Date().toISOString(),
    };

    const newAwayList = [...awayPeriods, newPeriod];
    const newMembers = members.map((m) => {
      if (m.user_id === userId) {
        return { ...m, is_away: true, away_period: newPeriod };
      }
      return m;
    });

    persistState(undefined, newMembers, newAwayList);
    return true;
  };

  /**
   * Clears an away period.
   */
  const clearMemberAway = async (awayId: string): Promise<boolean> => {
    const target = awayPeriods.find((a) => a.id === awayId);
    const newAwayList = awayPeriods.filter((a) => a.id !== awayId);
    const newMembers = members.map((m) => {
      if (target && m.user_id === target.user_id) {
        return { ...m, is_away: false, away_period: null };
      }
      return m;
    });

    persistState(undefined, newMembers, newAwayList);
    return true;
  };

  /**
   * DYNAMIC TASK CREATION:
   * Anybody in the flat can create a task and set the rotation order among roommates!
   */
  const createTask = async (data: {
    name: string;
    description?: string;
    intervalType: IntervalType;
    intervalValue: number;
    rotationUserIds: string[];
  }): Promise<{ success: boolean; message?: string }> => {
    if (!activeGroup || !currentUser) {
      return { success: false, message: 'You must be logged in and part of a flat to create chores.' };
    }

    if (!data.name.trim()) {
      return { success: false, message: 'Chore name cannot be empty.' };
    }

    if (!data.rotationUserIds || data.rotationUserIds.length === 0) {
      return { success: false, message: 'Please select at least one roommate for the rotation.' };
    }

    const taskId = `task-${Date.now()}`;
    const initialAssigneeId = data.rotationUserIds[0];
    const initialAssignee = members.find((m) => m.user_id === initialAssigneeId)?.profile ||
      allUsers.find((p) => p.id === initialAssigneeId) || currentUser;

    const rotation = data.rotationUserIds.map((userId, idx) => ({
      id: `rot-${taskId}-${idx}`,
      task_id: taskId,
      user_id: userId,
      position: idx,
      profile: members.find((m) => m.user_id === userId)?.profile || allUsers.find((p) => p.id === userId),
    }));

    const nextDue = calculateNextDueDate(new Date(), data.intervalType, data.intervalValue);

    const newActivity: TaskActivity = {
      id: `act-${Date.now()}`,
      task_id: taskId,
      actor_id: currentUser.id,
      action: 'rotation_changed',
      details: `${currentUser.name} created chore "${data.name}" with ${rotation.length} flatmates in rotation`,
      created_at: new Date().toISOString(),
      actor: currentUser,
    };

    const newTask: Task = {
      id: taskId,
      group_id: activeGroup.id,
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

    const newTasks = [newTask, ...tasks];
    persistState(newTasks);
    return { success: true };
  };

  /**
   * Updates task.
   */
  const updateTask = async (taskId: string, updates: Partial<Task>): Promise<boolean> => {
    const newTasks = tasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t));
    persistState(newTasks);
    return true;
  };

  /**
   * Toggles pause/resume on a task.
   */
  const togglePauseTask = async (taskId: string): Promise<boolean> => {
    const target = tasks.find((t) => t.id === taskId);
    if (!target || !target.state || !currentUser) return false;

    const isNowPaused = !target.state.is_paused;
    const newActivity: TaskActivity = {
      id: `act-${Date.now()}`,
      task_id: taskId,
      actor_id: currentUser.id,
      action: isNowPaused ? 'paused' : 'resumed',
      details: `${currentUser.name} ${isNowPaused ? 'paused' : 'resumed'} task`,
      created_at: new Date().toISOString(),
      actor: currentUser,
    };

    const updatedTask: Task = {
      ...target,
      state: {
        ...target.state,
        is_paused: isNowPaused,
        next_reminder_at: isNowPaused ? null : calculateNextReminder(target.state.next_due_at, null, new Date()).toISOString(),
        updated_at: new Date().toISOString(),
      },
      activities: [newActivity, ...(target.activities || [])],
    };

    const newTasks = tasks.map((t) => (t.id === taskId ? updatedTask : t));
    persistState(newTasks);
    return true;
  };

  /**
   * Deletes task.
   */
  const deleteTask = async (taskId: string): Promise<boolean> => {
    const newTasks = tasks.filter((t) => t.id !== taskId);
    persistState(newTasks);
    return true;
  };

  /**
   * Reorders task rotation members.
   * Records history of rotation alteration!
   */
  const reorderTaskRotation = async (taskId: string, userIdsInOrder: string[]): Promise<boolean> => {
    const target = tasks.find((t) => t.id === taskId);
    if (!target || !target.rotation || !currentUser) return false;

    const newRotation = userIdsInOrder.map((userId, idx) => {
      const existing = target.rotation?.find((r) => r.user_id === userId);
      return {
        id: existing?.id || `rot-${taskId}-${idx}`,
        task_id: taskId,
        user_id: userId,
        position: idx,
        profile: members.find((m) => m.user_id === userId)?.profile || allUsers.find((p) => p.id === userId),
      };
    });

    const currentAssigneePos = newRotation.findIndex((r) => r.user_id === target.state?.current_assignee_id);
    const newPos = currentAssigneePos >= 0 ? currentAssigneePos : 0;

    const newActivity: TaskActivity = {
      id: `act-${Date.now()}`,
      task_id: taskId,
      actor_id: currentUser.id,
      action: 'rotation_changed',
      details: `${currentUser.name} altered rotation order`,
      created_at: new Date().toISOString(),
      actor: currentUser,
    };

    const updatedTask: Task = {
      ...target,
      rotation: newRotation,
      state: target.state
        ? {
            ...target.state,
            current_rotation_position: newPos,
          }
        : undefined,
      activities: [newActivity, ...(target.activities || [])],
    };

    const newTasks = tasks.map((t) => (t.id === taskId ? updatedTask : t));
    persistState(newTasks);
    return true;
  };

  /**
   * Removes a member from group and updates task rotations.
   */
  const removeMemberFromGroup = async (userId: string): Promise<boolean> => {
    const newMembers = members.filter((m) => m.user_id !== userId);

    const newTasks = tasks.map((task) => {
      if (!task.rotation || !task.state) return task;
      const hasMember = task.rotation.some((r) => r.user_id === userId);
      if (!hasMember) return task;

      const { updatedRotation, updatedState } = handleMemberRemovalFromRotation(
        task.rotation,
        userId,
        task.state,
        awayPeriods
      );

      const nextAssignee = updatedState?.current_assignee_id
        ? members.find((m) => m.user_id === updatedState.current_assignee_id)?.profile
        : task.current_assignee;

      return {
        ...task,
        rotation: updatedRotation,
        state: updatedState ? { ...task.state, ...updatedState } : task.state,
        current_assignee: nextAssignee || task.current_assignee,
      };
    });

    persistState(newTasks, newMembers);
    return true;
  };

  /**
   * Admin: Transfers admin rights.
   */
  const transferAdmin = async (newAdminUserId: string): Promise<boolean> => {
    if (!activeGroup) return false;

    const updatedGroup: Group = {
      ...activeGroup,
      admin_user_id: newAdminUserId,
    };

    const updatedMembers = members.map((m) => ({
      ...m,
      role: (m.user_id === newAdminUserId ? 'admin' : m.user_id === activeGroup.admin_user_id ? 'member' : m.role) as any,
    }));

    const updatedGroups = groups.map((g) => (g.id === activeGroup.id ? updatedGroup : g));
    setActiveGroup(updatedGroup);
    persistState(undefined, updatedMembers, undefined, updatedGroups);
    return true;
  };

  /**
   * Admin: Renames a member.
   */
  const renameMember = async (userId: string, newName: string): Promise<boolean> => {
    const updatedMembers = members.map((m) => {
      if (m.user_id === userId) {
        return {
          ...m,
          profile: {
            ...m.profile,
            name: newName,
            id: m.user_id,
          },
        };
      }
      return m;
    });

    if (currentUser?.id === userId) {
      setCurrentUser((prev) => (prev ? { ...prev, name: newName } : null));
    }

    persistState(undefined, updatedMembers);
    return true;
  };

  /**
   * Admin: Regenerates group invite code.
   */
  const regenerateInviteCode = async (): Promise<string> => {
    if (!activeGroup) return '';
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const updatedGroup: Group = {
      ...activeGroup,
      invite_code: code,
    };

    const updatedGroups = groups.map((g) => (g.id === activeGroup.id ? updatedGroup : g));
    setActiveGroup(updatedGroup);
    persistState(undefined, undefined, undefined, updatedGroups);
    return code;
  };

  /**
   * Creates a new group.
   */
  const createGroup = async (name: string, timezone: string = 'Asia/Kolkata'): Promise<Group> => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const adminId = currentUser?.id || 'admin-1';
    const newGroup: Group = {
      id: `group-${Date.now()}`,
      name,
      invite_code: code,
      admin_user_id: adminId,
      timezone,
      created_at: new Date().toISOString(),
      member_count: 1,
    };

    const newMember: GroupMember = {
      id: `gm-${Date.now()}`,
      group_id: newGroup.id,
      user_id: adminId,
      role: 'admin',
      joined_at: new Date().toISOString(),
      profile: currentUser || { id: adminId, name: 'Admin' },
      is_away: false,
    };

    const updatedGroups = [...groups, newGroup];
    setGroups(updatedGroups);
    setActiveGroup(newGroup);
    setMembers([newMember]);
    setTasks([]);
    setAwayPeriods([]);

    persistState([], [newMember], [], updatedGroups);
    return newGroup;
  };

  /**
   * JOINS A FLAT:
   * Fixed and fully dynamic! Finds flat by code, adds user as member, updates flatmates list and active group.
   */
  const joinGroupByCode = async (
    code: string
  ): Promise<{ success: boolean; message?: string }> => {
    if (!currentUser) {
      return { success: false, message: 'Please log in to join a flat.' };
    }

    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      return { success: false, message: 'Please enter a valid invite code.' };
    }

    // Look for group in current groups or default mock group
    let foundGroup = groups.find((g) => g.invite_code.toUpperCase() === cleanCode);
    if (!foundGroup && cleanCode === MOCK_GROUP.invite_code) {
      foundGroup = MOCK_GROUP;
    }

    if (!foundGroup) {
      return {
        success: false,
        message: `No flat found with code "${cleanCode}". Please verify with your flatmate.`,
      };
    }

    // Check if user is already a member
    const isAlreadyMember = members.some(
      (m) => m.group_id === foundGroup!.id && m.user_id === currentUser.id
    );

    if (isAlreadyMember) {
      setActiveGroup(foundGroup);
      return { success: true, message: `You are already a member of "${foundGroup.name}".` };
    }

    // Add user as a member
    const newMember: GroupMember = {
      id: `gm-${Date.now()}`,
      group_id: foundGroup.id,
      user_id: currentUser.id,
      role: 'member',
      joined_at: new Date().toISOString(),
      profile: currentUser,
      is_away: false,
    };

    const updatedMembers = [...members, newMember];
    const updatedGroup: Group = {
      ...foundGroup,
      member_count: (foundGroup.member_count || members.length) + 1,
    };

    const updatedGroups = groups.some((g) => g.id === foundGroup!.id)
      ? groups.map((g) => (g.id === foundGroup!.id ? updatedGroup : g))
      : [...groups, updatedGroup];

    setMembers(updatedMembers);
    setGroups(updatedGroups);
    setActiveGroup(updatedGroup);

    persistState(undefined, updatedMembers, undefined, updatedGroups);

    return { success: true, message: `Joined "${foundGroup.name}" successfully!` };
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        isAuthenticated: Boolean(currentUser),
        allUsers,
        groups,
        activeGroup,
        members,
        tasks,
        awayPeriods,
        notifications,
        isSupabaseMode,
        isLoading,
        loginWithCredentials,
        registerUser,
        logout,
        setActiveGroup,
        markTaskCompleted,
        exchangeTurn,
        setMemberAway,
        clearMemberAway,
        createTask,
        updateTask,
        togglePauseTask,
        deleteTask,
        reorderTaskRotation,
        removeMemberFromGroup,
        transferAdmin,
        renameMember,
        regenerateInviteCode,
        createGroup,
        joinGroupByCode,
        markNotificationRead,
        clearAllNotifications,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
