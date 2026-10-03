import { NextResponse } from 'next/server';
import {
  createServerTask,
  completeServerTask,
  exchangeServerTask,
  togglePauseServerTask,
  deleteServerTask,
  reorderServerTaskRotation,
} from '@/lib/server-db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'create') {
      const { groupId, userId, data } = body;
      const result = createServerTask(groupId, userId, data);
      if (!result.success) {
        return NextResponse.json(result, { status: 400 });
      }
      return NextResponse.json(result);
    }

    if (action === 'complete') {
      const { taskId, userId, notes } = body;
      const result = completeServerTask(taskId, userId, notes);
      if (!result.success) {
        return NextResponse.json(result, { status: 400 });
      }
      return NextResponse.json(result);
    }

    if (action === 'exchange') {
      const { taskId, userId, replacementUserId, note } = body;
      const result = exchangeServerTask(taskId, userId, replacementUserId, note);
      if (!result.success) {
        return NextResponse.json(result, { status: 400 });
      }
      return NextResponse.json(result);
    }

    if (action === 'toggle_pause') {
      const { taskId, userId } = body;
      const success = togglePauseServerTask(taskId, userId);
      return NextResponse.json({ success });
    }

    if (action === 'delete') {
      const { taskId } = body;
      const success = deleteServerTask(taskId);
      return NextResponse.json({ success });
    }

    if (action === 'reorder') {
      const { taskId, userId, userIdsInOrder } = body;
      const success = reorderServerTaskRotation(taskId, userId, userIdsInOrder);
      return NextResponse.json({ success });
    }

    return NextResponse.json({ success: false, message: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
