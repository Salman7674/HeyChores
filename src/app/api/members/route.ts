import { NextResponse } from 'next/server';
import {
  setServerMemberAway,
  clearServerMemberAway,
  removeServerMember,
  renameServerMember,
} from '@/lib/server-db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'set_away') {
      const { groupId, userId, startAt, endAt } = body;
      const result = setServerMemberAway(groupId, userId, startAt, endAt);
      return NextResponse.json(result);
    }

    if (action === 'clear_away') {
      const { groupId, userId } = body;
      const result = clearServerMemberAway(groupId, userId);
      return NextResponse.json(result);
    }

    if (action === 'remove') {
      const { groupId, userId } = body;
      const success = removeServerMember(groupId, userId);
      return NextResponse.json({ success });
    }

    if (action === 'rename') {
      const { userId, newName } = body;
      const success = renameServerMember(userId, newName);
      return NextResponse.json({ success });
    }

    return NextResponse.json({ success: false, message: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
