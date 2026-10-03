import {
  IntervalType,
  TaskRotationMember,
  AwayPeriod,
  TaskState,
  TurnExchange,
} from '@/types';
import { addDays, addMonths, isAfter, isBefore, parseISO } from 'date-fns';

export interface AdvanceRotationParams {
  rotation: TaskRotationMember[];
  currentState: TaskState;
  awayPeriods: AwayPeriod[];
  completedAt: Date | string;
  intervalType: IntervalType;
  intervalValue: number;
  completedByUserId: string;
  activeExchange?: TurnExchange | null;
}

export interface AdvanceRotationResult {
  nextPosition: number;
  nextAssigneeId: string;
  nextDueAt: string;
  nextReminderAt: string;
  wasSkippedDueToAway: boolean;
  skippedUserIds: string[];
}

/**
 * Checks if a user is currently away at a given reference time.
 */
export function isUserAway(
  userId: string,
  awayPeriods: AwayPeriod[],
  referenceTime: Date | string = new Date()
): boolean {
  const ref = typeof referenceTime === 'string' ? parseISO(referenceTime) : referenceTime;
  
  return awayPeriods.some((period) => {
    if (period.user_id !== userId) return false;
    const start = parseISO(period.start_at);
    const end = parseISO(period.end_at);
    // User is away if ref is between start and end (inclusive of start, up to end)
    return (ref >= start && ref < end);
  });
}

/**
 * Calculates the next due date based on the completion date and frequency interval.
 */
export function calculateNextDueDate(
  baseDate: Date | string,
  intervalType: IntervalType,
  intervalValue: number
): Date {
  const base = typeof baseDate === 'string' ? parseISO(baseDate) : baseDate;
  const val = Math.max(1, intervalValue);

  switch (intervalType) {
    case 'days':
      return addDays(base, val);
    case 'weeks':
      return addDays(base, val * 7);
    case 'months':
      return addMonths(base, val);
    default:
      return addDays(base, val);
  }
}

/**
 * Calculates the next reminder timestamp.
 * Rules:
 * 1. Initial reminder at due date.
 * 2. If already at/past due date, next is 12 hours later.
 * 3. Next is 24 hours later, then every 24 hours.
 */
export function calculateNextReminder(
  dueDate: Date | string,
  lastRemindedAt?: Date | string | null,
  now: Date | string = new Date()
): Date {
  const due = typeof dueDate === 'string' ? parseISO(dueDate) : dueDate;
  const current = typeof now === 'string' ? parseISO(now) : now;

  // If due date is in the future, the next reminder is at the due date
  if (isAfter(due, current)) {
    return due;
  }

  // If never reminded yet, reminder is due immediately
  if (!lastRemindedAt) {
    return current;
  }

  const last = typeof lastRemindedAt === 'string' ? parseISO(lastRemindedAt) : lastRemindedAt;
  const diffHours = (current.getTime() - due.getTime()) / (1000 * 60 * 60);

  // If within the first 12 hours past due
  if (diffHours < 12) {
    return new Date(due.getTime() + 12 * 60 * 60 * 1000);
  }

  // If between 12 and 36 hours past due
  if (diffHours < 36) {
    return new Date(due.getTime() + 36 * 60 * 60 * 1000);
  }

  // After that, every 24 hours after last reminder
  return addDays(last, 1);
}

/**
 * Finds the next eligible assignee in the rotation, skipping anyone currently marked away.
 * Returns the rotation index and user_id.
 */
export function findNextEligibleAssignee(
  rotation: TaskRotationMember[],
  startPosition: number,
  awayPeriods: AwayPeriod[],
  referenceTime: Date | string = new Date()
): { nextIndex: number; nextAssigneeId: string; skippedUserIds: string[] } {
  if (!rotation || rotation.length === 0) {
    throw new Error('Rotation cannot be empty');
  }

  // Sort rotation by position to be deterministic
  const sortedRotation = [...rotation].sort((a, b) => a.position - b.position);
  const total = sortedRotation.length;

  const skippedUserIds: string[] = [];

  // Try each member in sequence starting from (startPosition + 1)
  for (let offset = 1; offset <= total; offset++) {
    const candidateIndex = (startPosition + offset) % total;
    const candidate = sortedRotation[candidateIndex];

    const away = isUserAway(candidate.user_id, awayPeriods, referenceTime);
    if (!away) {
      return {
        nextIndex: candidate.position,
        nextAssigneeId: candidate.user_id,
        skippedUserIds,
      };
    } else {
      skippedUserIds.push(candidate.user_id);
    }
  }

  // Fallback: If everyone is away, the turn advances to the next chronological person anyway
  const defaultIndex = (startPosition + 1) % total;
  return {
    nextIndex: sortedRotation[defaultIndex].position,
    nextAssigneeId: sortedRotation[defaultIndex].user_id,
    skippedUserIds,
  };
}

/**
 * Core Rotation Engine: advances the task rotation atomically upon completion.
 * Respects temporary exchanges, away status, recurrence intervals, and reminder schedules.
 */
export function advanceTaskRotation(params: AdvanceRotationParams): AdvanceRotationResult {
  const {
    rotation,
    currentState,
    awayPeriods,
    completedAt,
    intervalType,
    intervalValue,
  } = params;

  if (!rotation || rotation.length === 0) {
    throw new Error('Task has no rotation members');
  }

  const completedDate = typeof completedAt === 'string' ? parseISO(completedAt) : completedAt;

  // The base permanent position to advance from:
  // Even if a turn was temporarily exchanged to someone else, the permanent slot
  // was currentState.current_rotation_position.
  const currentPos = currentState.current_rotation_position ?? 0;

  // Find next eligible assignee
  const { nextIndex, nextAssigneeId, skippedUserIds } = findNextEligibleAssignee(
    rotation,
    currentPos,
    awayPeriods,
    completedDate
  );

  // Calculate next due date
  const nextDueDate = calculateNextDueDate(completedDate, intervalType, intervalValue);

  // Calculate next reminder date
  const nextReminderDate = calculateNextReminder(nextDueDate, null, completedDate);

  return {
    nextPosition: nextIndex,
    nextAssigneeId,
    nextDueAt: nextDueDate.toISOString(),
    nextReminderAt: nextReminderDate.toISOString(),
    wasSkippedDueToAway: skippedUserIds.length > 0,
    skippedUserIds,
  };
}

/**
 * Handles member removal from a task's rotation.
 * Re-indexes positions and re-assigns if the removed user was current.
 */
export function handleMemberRemovalFromRotation(
  currentRotation: TaskRotationMember[],
  removedUserId: string,
  currentState: TaskState,
  awayPeriods: AwayPeriod[],
  now: Date | string = new Date()
): {
  updatedRotation: TaskRotationMember[];
  updatedState?: Partial<TaskState>;
} {
  const filtered = currentRotation.filter((m) => m.user_id !== removedUserId);
  if (filtered.length === 0) {
    return {
      updatedRotation: [],
      updatedState: {
        current_assignee_id: '',
        current_rotation_position: 0,
      },
    };
  }

  // Re-index positions: 0, 1, 2, ...
  const updatedRotation = filtered
    .sort((a, b) => a.position - b.position)
    .map((m, idx) => ({ ...m, position: idx }));

  let updatedState: Partial<TaskState> | undefined;

  // If the removed member was the current assignee, find the next member immediately
  if (currentState.current_assignee_id === removedUserId) {
    // Current position needs adjustment: previous position minus 1, or clamp
    const prevPos = Math.max(0, currentState.current_rotation_position - 1);
    const { nextIndex, nextAssigneeId } = findNextEligibleAssignee(
      updatedRotation,
      prevPos,
      awayPeriods,
      now
    );

    updatedState = {
      current_rotation_position: nextIndex,
      current_assignee_id: nextAssigneeId,
    };
  } else {
    // Adjust current_rotation_position index to point to current member's new index
    const currentMember = updatedRotation.find((m) => m.user_id === currentState.current_assignee_id);
    if (currentMember) {
      updatedState = {
        current_rotation_position: currentMember.position,
      };
    }
  }

  return { updatedRotation, updatedState };
}

/**
 * Handles adding a member to an existing rotation at a specified position.
 */
export function addMemberToRotation(
  currentRotation: TaskRotationMember[],
  newUserId: string,
  targetPosition?: number
): TaskRotationMember[] {
  const sorted = [...currentRotation].sort((a, b) => a.position - b.position);
  const insertPos = targetPosition !== undefined ? Math.min(Math.max(0, targetPosition), sorted.length) : sorted.length;

  sorted.splice(insertPos, 0, {
    id: `temp-${Date.now()}`,
    task_id: sorted[0]?.task_id || '',
    user_id: newUserId,
    position: insertPos,
  });

  return sorted.map((m, idx) => ({
    ...m,
    position: idx,
  }));
}
