import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseServerConfigured, createClient } from '@/lib/supabase/server';
import { calculateNextReminder } from '@/lib/rotation-engine';
import { sendWebPushNotification } from '@/lib/notifications/web-push';
import type { PushSubscription } from 'web-push';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return handleReminders(request);
}

export async function POST(request: NextRequest) {
  return handleReminders(request);
}

async function handleReminders(request: NextRequest) {
  // Check authorization via CRON_SECRET if set
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();

  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({
      message: 'Supabase not configured. Reminder cron in local preview mode.',
      timestamp: now.toISOString(),
      processedCount: 0,
    });
  }

  try {
    const supabase = await createClient();

    // Query active tasks whose reminder is due
    const { data: overdueStates, error: stateError } = await supabase
      .from('task_state')
      .select(`
        task_id,
        current_rotation_position,
        current_assignee_id,
        next_due_at,
        next_reminder_at,
        last_reminded_at,
        is_paused,
        tasks!inner (
          id,
          group_id,
          name,
          is_active,
          groups!inner (
            id,
            name
          )
        )
      `)
      .eq('is_paused', false)
      .lte('next_reminder_at', now.toISOString());

    if (stateError) {
      console.error('Failed to query overdue tasks:', stateError);
      return NextResponse.json({ error: stateError.message }, { status: 500 });
    }

    if (!overdueStates || overdueStates.length === 0) {
      return NextResponse.json({
        message: 'No tasks need reminders at this time.',
        timestamp: now.toISOString(),
        processedCount: 0,
      });
    }

    let processedCount = 0;

    for (const item of overdueStates) {
      const task = item.tasks as any;
      const group = task.groups as any;
      const assigneeId = item.current_assignee_id;
      const taskName = task.name;
      const groupName = group.name;

      // 1. Create In-App Notification
      await supabase.from('in_app_notifications').insert({
        user_id: assigneeId,
        group_id: task.group_id,
        task_id: task.id,
        title: `🔔 ${groupName}`,
        message: `It's your turn for "${taskName}"!`,
        type: 'reminder',
      });

      // 2. Query Push Subscriptions for Assignee
      const { data: subscriptions } = await supabase
        .from('notification_subscriptions')
        .select('subscription_data')
        .eq('user_id', assigneeId);

      if (subscriptions && subscriptions.length > 0) {
        for (const sub of subscriptions) {
          await sendWebPushNotification(sub.subscription_data as any, {
            title: `🔔 ${groupName}`,
            body: `It's your turn to ${taskName}. Due: ${new Date(item.next_due_at).toLocaleDateString()}`,
            url: `/groups/${task.group_id}`,
            tag: `chore-${task.id}`,
          });
        }
      }

      // 3. Calculate and update next reminder timestamp
      const nextReminderDate = calculateNextReminder(item.next_due_at, now, now);

      await supabase
        .from('task_state')
        .update({
          last_reminded_at: now.toISOString(),
          next_reminder_at: nextReminderDate.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('task_id', task.id);

      processedCount++;
    }

    return NextResponse.json({
      success: true,
      processedCount,
      timestamp: now.toISOString(),
    });
  } catch (err: any) {
    console.error('Error processing reminders cron:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
