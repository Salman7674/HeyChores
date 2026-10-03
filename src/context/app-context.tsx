'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
  deleteGroup: (groupId: string) => Promise<{ success: boolean; message?: string }>;
  leaveGroup: (groupId: string) => Promise<{ success: boolean; message?: string }>;
  markNotificationRead: (id: string) => void;
  clearAllNotifications: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isSupabaseMode] = useState<boolean>(() => isSupabaseConfigured());
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [allUsers, setAllUsers] = useState<Profile[]>(MOCK_PROFILES);

  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroup, setActiveGroupState] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [awayPeriods, setAwayPeriods] = useState<AwayPeriod[]>([]);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const activeGroupIdRef = useRef<string | null>(null);

  /**
   * Fetch current flat data and user groups from centralized server database
   */
  const fetchServerData = useCallback(async (userId?: string, targetGroupId?: string) => {
    try {
      const uId = userId || currentUser?.id;
      if (!uId) {
        setIsLoading(false);
        return;
      }

      const gId = targetGroupId || activeGroupIdRef.current || '';
      const res = await fetch(`/api/flats?userId=${encodeURIComponent(uId)}${gId ? `&groupId=${encodeURIComponent(gId)}` : ''}`);
      if (!res.ok) return;

      const data = await res.json();
      if (data.success) {
        if (data.allUsers) setAllUsers(data.allUsers);
        setGroups(data.groups || []);

        const currentActive = data.activeGroup;
        setActiveGroupState(currentActive);
        activeGroupIdRef.current = currentActive?.id || null;

        setMembers(data.members || []);
        setTasks(data.tasks || []);
        setAwayPeriods(data.awayPeriods || []);
      }
    } catch (err) {
      console.error('Error fetching centralized flat data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.id]);

  /**
   * One-time sync legacy localStorage data to server so existing local flats (like Simran) are never lost
   */
  const syncLegacyLocalStorage = async () => {
    try {
      const savedUsers = localStorage.getItem('heychores_users');
      const savedGroups = localStorage.getItem('heychores_all_groups');
      const savedMembers = localStorage.getItem('heychores_all_members');
      const savedTasks = localStorage.getItem('heychores_all_tasks');
      const savedAway = localStorage.getItem('heychores_all_away');

      if (savedGroups || savedUsers || savedMembers || savedTasks) {
        await fetch('/api/flats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'sync',
            localUsers: savedUsers ? JSON.parse(savedUsers) : [],
            localGroups: savedGroups ? JSON.parse(savedGroups) : [],
            localMembers: savedMembers ? JSON.parse(savedMembers) : [],
            localTasks: savedTasks ? JSON.parse(savedTasks) : [],
            localAway: savedAway ? JSON.parse(savedAway) : [],
          }),
        });
      }
    } catch (e) {
      console.warn('LocalStorage legacy sync note:', e);
    }
  };

  // Initialize Auth & Storage
  useEffect(() => {
    async function initAuth() {
      setIsLoading(true);
      await syncLegacyLocalStorage();

      if (isSupabaseMode) {
        try {
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const profile: Profile = {
              id: user.id,
              name: user.user_metadata?.name || user.email?.split('@')[0] || 'Roommate',
              username: user.user_metadata?.username || user.email?.split('@')[0],
              email: user.email,
              avatar_url: user.user_metadata?.avatar_url,
            };
            setCurrentUser(profile);
            await fetchServerData(profile.id);
            return;
          }
        } catch (err) {
          console.error('Supabase user check error:', err);
        }
      }

      // Check saved user session
      const savedUserId = typeof window !== 'undefined' ? localStorage.getItem('heychores_current_user_id') : null;
      if (savedUserId) {
        try {
          const res = await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'me', userId: savedUserId }),
          });
          const data = await res.json();
          if (data.success && data.user) {
            setCurrentUser(data.user);
            await fetchServerData(data.user.id);
            return;
          }
        } catch (e) {
          console.warn('Error fetching active user session:', e);
        }
      }

      setIsLoading(false);
    }

    initAuth();
  }, [fetchServerData, isSupabaseMode]);

  // Periodic centralized synchronization (polling every 5 seconds)
  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(() => {
      fetchServerData(currentUser.id, activeGroupIdRef.current || undefined);
    }, 5000);
    return () => clearInterval(interval);
  }, [currentUser, fetchServerData]);

  const setActiveGroup = (group: Group) => {
    setActiveGroupState(group);
    activeGroupIdRef.current = group.id;
    if (currentUser) {
      fetchServerData(currentUser.id, group.id);
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

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          usernameOrEmail: term,
          password: password.trim(),
        }),
      });

      const data = await res.json();
      if (!data.success || !data.user) {
        return { success: false, message: data.message || 'Invalid username or password.' };
      }

      setCurrentUser(data.user);
      localStorage.setItem('heychores_current_user_id', data.user.id);
      await fetchServerData(data.user.id);
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message || 'Login failed' };
    }
  };

  /**
   * Register a new account with Username & Password
   * New user starts with ZERO flats and ZERO chores!
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

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          name: cleanName,
          username: cleanUsername,
          password: password.trim(),
          email: email?.trim(),
        }),
      });

      const data = await res.json();
      if (!data.success || !data.user) {
        return { success: false, message: data.message || 'Registration failed.' };
      }

      setCurrentUser(data.user);
      setActiveGroupState(null);
      activeGroupIdRef.current = null;
      setGroups([]);
      setMembers([]);
      setTasks([]);
      setAwayPeriods([]);
      localStorage.setItem('heychores_current_user_id', data.user.id);
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message || 'Registration failed' };
    }
  };

  const logout = async () => {
    if (isSupabaseMode) {
      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch {}
    }
    localStorage.removeItem('heychores_current_user_id');
    setCurrentUser(null);
    setActiveGroupState(null);
    activeGroupIdRef.current = null;
    setGroups([]);
    setMembers([]);
    setTasks([]);
    setAwayPeriods([]);
  };

  /**
   * Completes a task turn atomically in centralized database
   */
  const markTaskCompleted = async (
    taskId: string,
    notes?: string
  ): Promise<{ success: boolean; message?: string }> => {
    if (!currentUser) {
      return { success: false, message: 'You must be logged in to complete a chore.' };
    }

    // Trigger celebration confetti
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.7 },
        colors: ['#0d9488', '#14b8a6', '#f59e0b', '#38bdf8', '#8b5cf6'],
      });
    } catch {}

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete',
          taskId,
          userId: currentUser.id,
          notes,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        return { success: false, message: data.message || 'Failed to complete chore.' };
      }

      await fetchServerData();
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message || 'Server error completing chore.' };
    }
  };

  /**
   * Exchanges turn with another roommate
   */
  const exchangeTurn = async (
    taskId: string,
    replacementUserId: string,
    note?: string
  ): Promise<{ success: boolean; message?: string }> => {
    if (!currentUser) {
      return { success: false, message: 'You must be logged in to exchange turns.' };
    }

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'exchange',
          taskId,
          userId: currentUser.id,
          replacementUserId,
          note,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        return { success: false, message: data.message || 'Failed to exchange turn.' };
      }

      await fetchServerData();
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message || 'Server error exchanging chore.' };
    }
  };

  /**
   * Sets away period for a roommate
   */
  const setMemberAway = async (userId: string, startAt: string, endAt: string): Promise<boolean> => {
    if (!activeGroup) return false;

    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set_away',
          groupId: activeGroup.id,
          userId,
          startAt,
          endAt,
        }),
      });

      const data = await res.json();
      if (data.success) {
        await fetchServerData();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  /**
   * Clears an away period
   */
  const clearMemberAway = async (awayId: string): Promise<boolean> => {
    if (!activeGroup) return false;
    const target = awayPeriods.find((a) => a.id === awayId);
    const targetUserId = target?.user_id || currentUser?.id;
    if (!targetUserId) return false;

    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clear_away',
          groupId: activeGroup.id,
          userId: targetUserId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        await fetchServerData();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  /**
   * DYNAMIC TASK CREATION:
   * Anyone in the flat can create a chore and assign roommate rotation order!
   */
  const createTask = async (data: {
    name: string;
    description?: string;
    intervalType: IntervalType;
    intervalValue: number;
    rotationUserIds: string[];
  }): Promise<{ success: boolean; message?: string }> => {
    if (!activeGroup || !currentUser) {
      return { success: false, message: 'You must be part of a flat to create chores.' };
    }

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          groupId: activeGroup.id,
          userId: currentUser.id,
          data,
        }),
      });

      const resData = await res.json();
      if (!resData.success) {
        return { success: false, message: resData.message || 'Failed to create chore.' };
      }

      await fetchServerData();
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message || 'Server error creating chore.' };
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>): Promise<boolean> => {
    return true;
  };

  const togglePauseTask = async (taskId: string): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_pause',
          taskId,
          userId: currentUser.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchServerData();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const deleteTask = async (taskId: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', taskId }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchServerData();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const reorderTaskRotation = async (taskId: string, userIdsInOrder: string[]): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reorder',
          taskId,
          userId: currentUser.id,
          userIdsInOrder,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchServerData();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const removeMemberFromGroup = async (userId: string): Promise<boolean> => {
    if (!activeGroup) return false;
    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove',
          groupId: activeGroup.id,
          userId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchServerData();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const transferAdmin = async (newAdminUserId: string): Promise<boolean> => {
    if (!activeGroup) return false;
    try {
      const res = await fetch('/api/flats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'transfer_admin',
          groupId: activeGroup.id,
          newAdminUserId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchServerData();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const renameMember = async (userId: string, newName: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'rename',
          userId,
          newName,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (currentUser?.id === userId) {
          setCurrentUser((prev) => (prev ? { ...prev, name: newName } : null));
        }
        await fetchServerData();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const regenerateInviteCode = async (): Promise<string> => {
    if (!activeGroup) return '';
    try {
      const res = await fetch('/api/flats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'regenerate_code',
          groupId: activeGroup.id,
        }),
      });
      const data = await res.json();
      if (data.success && data.invite_code) {
        await fetchServerData();
        return data.invite_code;
      }
      return '';
    } catch {
      return '';
    }
  };

  /**
   * Creates a new group centrally.
   * Creator becomes admin and member.
   * Flat starts clean with ZERO chores!
   */
  const createGroup = async (name: string, timezone: string = 'Asia/Kolkata'): Promise<Group> => {
    const adminId = currentUser?.id || 'admin-1';
    const res = await fetch('/api/flats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        name,
        adminUserId: adminId,
        timezone,
      }),
    });

    const data = await res.json();
    if (!data.success || !data.group) {
      throw new Error(data.message || 'Failed to create flat');
    }

    activeGroupIdRef.current = data.group.id;
    await fetchServerData(adminId, data.group.id);
    return data.group;
  };

  /**
   * JOINS A FLAT CENTRALLY:
   * Adds user to flat membership in centralized database.
   * Works across all devices, browsers, and sessions!
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

    try {
      const res = await fetch('/api/flats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'join',
          code: cleanCode,
          userId: currentUser.id,
          userProfile: currentUser,
        }),
      });

      const data = await res.json();
      if (!data.success || !data.group) {
        return {
          success: false,
          message: data.message || `No flat found with code "${cleanCode}". Please verify with your flatmate.`,
        };
      }

      activeGroupIdRef.current = data.group.id;
      await fetchServerData(currentUser.id, data.group.id);

      return {
        success: true,
        message: data.message || `Joined "${data.group.name}" successfully!`,
      };
    } catch (err: any) {
      return { success: false, message: err.message || 'Server error joining flat.' };
    }
  };

  /**
   * Deletes a flat permanently (Admin only)
   */
  const deleteGroup = async (groupId: string): Promise<{ success: boolean; message?: string }> => {
    if (!currentUser) return { success: false, message: 'You must be logged in.' };

    try {
      const res = await fetch('/api/flats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          groupId,
          userId: currentUser.id,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        return { success: false, message: data.message || 'Failed to delete flat.' };
      }

      if (activeGroupIdRef.current === groupId) {
        activeGroupIdRef.current = null;
        setActiveGroupState(null);
      }

      await fetchServerData();
      return { success: true, message: data.message || 'Flat deleted successfully.' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Server error deleting flat.' };
    }
  };

  /**
   * Leaves a flat
   */
  const leaveGroup = async (groupId: string): Promise<{ success: boolean; message?: string }> => {
    if (!currentUser) return { success: false, message: 'You must be logged in.' };

    try {
      const res = await fetch('/api/flats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'leave',
          groupId,
          userId: currentUser.id,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        return { success: false, message: data.message || 'Failed to leave flat.' };
      }

      if (activeGroupIdRef.current === groupId) {
        activeGroupIdRef.current = null;
        setActiveGroupState(null);
      }

      await fetchServerData();
      return { success: true, message: data.message || 'You left the flat.' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Server error leaving flat.' };
    }
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
        deleteGroup,
        leaveGroup,
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
