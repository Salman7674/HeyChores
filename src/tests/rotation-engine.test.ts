import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  advanceTaskRotation,
  findNextEligibleAssignee,
  calculateNextDueDate,
  calculateNextReminder,
  isUserAway,
  handleMemberRemovalFromRotation,
  addMemberToRotation,
} from '../lib/rotation-engine';
import { TaskRotationMember, TaskState, AwayPeriod } from '../types';

describe('Rotation Engine Tests', () => {
  const members: TaskRotationMember[] = [
    { id: '1', task_id: 't1', user_id: 'Ahmed', position: 0 },
    { id: '2', task_id: 't1', user_id: 'Rahul', position: 1 },
    { id: '3', task_id: 't1', user_id: 'Sameer', position: 2 },
    { id: '4', task_id: 't1', user_id: 'Usman', position: 3 },
  ];

  const baseState: TaskState = {
    task_id: 't1',
    current_rotation_position: 0,
    current_assignee_id: 'Ahmed',
    next_due_at: '2026-09-12T09:00:00Z',
    is_paused: false,
    updated_at: '2026-09-09T09:00:00Z',
  };

  it('1. Basic Rotation: Ahmed -> Rahul -> Sameer -> Usman -> Ahmed', () => {
    // Ahmed completes
    const res1 = advanceTaskRotation({
      rotation: members,
      currentState: baseState,
      awayPeriods: [],
      completedAt: '2026-09-12T10:00:00Z',
      intervalType: 'days',
      intervalValue: 3,
      completedByUserId: 'Ahmed',
    });
    assert.strictEqual(res1.nextAssigneeId, 'Rahul');
    assert.strictEqual(res1.nextPosition, 1);

    // Rahul completes
    const stateRahul: TaskState = {
      ...baseState,
      current_rotation_position: res1.nextPosition,
      current_assignee_id: res1.nextAssigneeId,
    };
    const res2 = advanceTaskRotation({
      rotation: members,
      currentState: stateRahul,
      awayPeriods: [],
      completedAt: '2026-09-15T10:00:00Z',
      intervalType: 'days',
      intervalValue: 3,
      completedByUserId: 'Rahul',
    });
    assert.strictEqual(res2.nextAssigneeId, 'Sameer');
    assert.strictEqual(res2.nextPosition, 2);

    // Sameer completes
    const stateSameer: TaskState = {
      ...baseState,
      current_rotation_position: res2.nextPosition,
      current_assignee_id: res2.nextAssigneeId,
    };
    const res3 = advanceTaskRotation({
      rotation: members,
      currentState: stateSameer,
      awayPeriods: [],
      completedAt: '2026-09-18T10:00:00Z',
      intervalType: 'days',
      intervalValue: 3,
      completedByUserId: 'Sameer',
    });
    assert.strictEqual(res3.nextAssigneeId, 'Usman');
    assert.strictEqual(res3.nextPosition, 3);

    // Usman completes -> loops back to Ahmed
    const stateUsman: TaskState = {
      ...baseState,
      current_rotation_position: res3.nextPosition,
      current_assignee_id: res3.nextAssigneeId,
    };
    const res4 = advanceTaskRotation({
      rotation: members,
      currentState: stateUsman,
      awayPeriods: [],
      completedAt: '2026-09-21T10:00:00Z',
      intervalType: 'days',
      intervalValue: 3,
      completedByUserId: 'Usman',
    });
    assert.strictEqual(res4.nextAssigneeId, 'Ahmed');
    assert.strictEqual(res4.nextPosition, 0);
  });

  it('2. Away functionality: Sameer is away, Rahul completes -> Usman is next (skips Sameer)', () => {
    const awayPeriods: AwayPeriod[] = [
      {
        id: 'away-1',
        group_id: 'g1',
        user_id: 'Sameer',
        start_at: '2026-09-15T00:00:00Z',
        end_at: '2026-09-20T23:59:59Z',
      },
    ];

    // Rahul completes on Sep 15 while Sameer is away
    const rahulState: TaskState = {
      ...baseState,
      current_rotation_position: 1,
      current_assignee_id: 'Rahul',
    };

    const res = advanceTaskRotation({
      rotation: members,
      currentState: rahulState,
      awayPeriods,
      completedAt: '2026-09-15T12:00:00Z',
      intervalType: 'days',
      intervalValue: 3,
      completedByUserId: 'Rahul',
    });

    assert.strictEqual(res.nextAssigneeId, 'Usman');
    assert.strictEqual(res.nextPosition, 3);
    assert.strictEqual(res.wasSkippedDueToAway, true);
    assert.deepStrictEqual(res.skippedUserIds, ['Sameer']);
  });

  it('3. Multiple away members: Rahul and Sameer are away -> Ahmed completes -> Usman is next', () => {
    const awayPeriods: AwayPeriod[] = [
      {
        id: 'away-1',
        group_id: 'g1',
        user_id: 'Rahul',
        start_at: '2026-09-10T00:00:00Z',
        end_at: '2026-09-20T00:00:00Z',
      },
      {
        id: 'away-2',
        group_id: 'g1',
        user_id: 'Sameer',
        start_at: '2026-09-10T00:00:00Z',
        end_at: '2026-09-20T00:00:00Z',
      },
    ];

    const res = advanceTaskRotation({
      rotation: members,
      currentState: baseState, // Ahmed is position 0
      awayPeriods,
      completedAt: '2026-09-12T10:00:00Z',
      intervalType: 'days',
      intervalValue: 3,
      completedByUserId: 'Ahmed',
    });

    assert.strictEqual(res.nextAssigneeId, 'Usman');
    assert.strictEqual(res.nextPosition, 3);
    assert.deepStrictEqual(res.skippedUserIds, ['Rahul', 'Sameer']);
  });

  it('4. Temporary Turn Exchange: A exchanges with B, B completes, permanent rotation advances from A', () => {
    // Ahmed (position 0) exchanges with Rahul (position 1)
    // Rahul completes Ahmed's occurrence
    const exchangeActive = {
      id: 'ex-1',
      task_id: 't1',
      occurrence_id: 'occ-1',
      original_assignee_id: 'Ahmed',
      replacement_assignee_id: 'Rahul',
      is_active: true,
      created_at: '2026-09-12T08:00:00Z',
    };

    const currentState: TaskState = {
      ...baseState,
      current_rotation_position: 0, // Slot was Ahmed
      current_assignee_id: 'Rahul',  // Temporarily assigned to Rahul
    };

    const res = advanceTaskRotation({
      rotation: members,
      currentState,
      awayPeriods: [],
      completedAt: '2026-09-12T10:00:00Z',
      intervalType: 'days',
      intervalValue: 3,
      completedByUserId: 'Rahul',
      activeExchange: exchangeActive,
    });

    // Ahmed's turn was completed, so the permanent rotation advances to slot 1: Rahul
    assert.strictEqual(res.nextAssigneeId, 'Rahul');
    assert.strictEqual(res.nextPosition, 1);
  });

  it('5. Return from away: Sameer returns after Sep 20 and becomes eligible again', () => {
    const awayPeriods: AwayPeriod[] = [
      {
        id: 'away-1',
        group_id: 'g1',
        user_id: 'Sameer',
        start_at: '2026-09-15T00:00:00Z',
        end_at: '2026-09-20T00:00:00Z',
      },
    ];

    // Check before Sep 20: away
    assert.strictEqual(isUserAway('Sameer', awayPeriods, '2026-09-18T00:00:00Z'), true);
    // Check after Sep 20: NOT away
    assert.strictEqual(isUserAway('Sameer', awayPeriods, '2026-09-21T00:00:00Z'), false);

    // When Rahul completes on Sep 22, Sameer is eligible!
    const rahulState: TaskState = {
      ...baseState,
      current_rotation_position: 1,
      current_assignee_id: 'Rahul',
    };

    const res = advanceTaskRotation({
      rotation: members,
      currentState: rahulState,
      awayPeriods,
      completedAt: '2026-09-22T12:00:00Z',
      intervalType: 'days',
      intervalValue: 3,
      completedByUserId: 'Rahul',
    });

    assert.strictEqual(res.nextAssigneeId, 'Sameer');
    assert.strictEqual(res.nextPosition, 2);
    assert.strictEqual(res.wasSkippedDueToAway, false);
  });

  it('6. Member Removal: Current person removed -> System immediately assigns next eligible member', () => {
    // Current assignee is Rahul (position 1)
    const currentState: TaskState = {
      ...baseState,
      current_rotation_position: 1,
      current_assignee_id: 'Rahul',
    };

    // Rahul is removed from the flat
    const { updatedRotation, updatedState } = handleMemberRemovalFromRotation(
      members,
      'Rahul',
      currentState,
      [],
      '2026-09-14T10:00:00Z'
    );

    // Remaining: Ahmed (0), Sameer (1), Usman (2)
    assert.strictEqual(updatedRotation.length, 3);
    assert.strictEqual(updatedRotation[0].user_id, 'Ahmed');
    assert.strictEqual(updatedRotation[1].user_id, 'Sameer');
    assert.strictEqual(updatedRotation[2].user_id, 'Usman');

    // Next assignee becomes Sameer
    assert.strictEqual(updatedState?.current_assignee_id, 'Sameer');
    assert.strictEqual(updatedState?.current_rotation_position, 1);
  });

  it('7. Adding a member to rotation at a specific position', () => {
    // Ahmed (0) -> Rahul (1) -> Sameer (2) -> Usman (3)
    // Add Imran at position 2 -> Ahmed -> Rahul -> Imran -> Sameer -> Usman
    const updated = addMemberToRotation(members, 'Imran', 2);
    assert.strictEqual(updated.length, 5);
    assert.strictEqual(updated[0].user_id, 'Ahmed');
    assert.strictEqual(updated[1].user_id, 'Rahul');
    assert.strictEqual(updated[2].user_id, 'Imran');
    assert.strictEqual(updated[3].user_id, 'Sameer');
    assert.strictEqual(updated[4].user_id, 'Usman');
  });

  it('8. Recurrence Calculations: Days, Weeks, Months', () => {
    const base = '2026-09-12T10:00:00Z';

    // Every 3 days
    const dueDays = calculateNextDueDate(base, 'days', 3);
    assert.strictEqual(dueDays.toISOString().slice(0, 10), '2026-09-15');

    // Weekly (1 week)
    const dueWeek = calculateNextDueDate(base, 'weeks', 1);
    assert.strictEqual(dueWeek.toISOString().slice(0, 10), '2026-09-19');

    // Every 2 weeks
    const due2Weeks = calculateNextDueDate(base, 'weeks', 2);
    assert.strictEqual(due2Weeks.toISOString().slice(0, 10), '2026-09-26');

    // Every month
    const dueMonth = calculateNextDueDate(base, 'months', 1);
    assert.strictEqual(dueMonth.toISOString().slice(0, 10), '2026-10-12');
  });

  it('9. Reminders logic: Schedules next reminder correctly and stops previous', () => {
    const dueDate = '2026-09-15T09:00:00Z';

    // Before due date, next reminder is due at due date
    const r1 = calculateNextReminder(dueDate, null, '2026-09-14T09:00:00Z');
    assert.strictEqual(r1.toISOString(), '2026-09-15T09:00:00.000Z');

    // 2 hours past due date, next reminder is 12 hours after due date
    const r2 = calculateNextReminder(dueDate, '2026-09-15T09:00:00Z', '2026-09-15T11:00:00Z');
    assert.strictEqual(r2.toISOString(), '2026-09-15T21:00:00.000Z');

    // Upon completion, advanceTaskRotation sets next_reminder_at for the NEW due date
    const res = advanceTaskRotation({
      rotation: members,
      currentState: baseState,
      awayPeriods: [],
      completedAt: '2026-09-15T12:00:00Z',
      intervalType: 'days',
      intervalValue: 3,
      completedByUserId: 'Ahmed',
    });

    // Next due is Sep 18, so new next_reminder_at is set for Sep 18
    assert.strictEqual(res.nextDueAt.slice(0, 10), '2026-09-18');
    assert.strictEqual(res.nextReminderAt.slice(0, 10), '2026-09-18');
  });
});
