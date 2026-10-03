import { NextResponse } from 'next/server';
import {
  getUserGroups,
  createServerGroup,
  joinServerGroupByCode,
  regenerateServerInviteCode,
  transferServerAdmin,
  getGroupData,
  getAllUsers,
  getDatabase,
  syncLocalDataToServer,
} from '@/lib/server-db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const requestedGroupId = searchParams.get('groupId');

    if (!userId) {
      return NextResponse.json({
        success: true,
        groups: [],
        activeGroup: null,
        members: [],
        tasks: [],
        awayPeriods: [],
        allUsers: getAllUsers(),
      });
    }

    const { groups, activeGroup: defaultActive } = getUserGroups(userId);
    let activeGroup = groups.find((g) => g.id === requestedGroupId) || defaultActive;

    let groupDetails = { members: [] as any[], tasks: [] as any[], awayPeriods: [] as any[] };
    if (activeGroup) {
      groupDetails = getGroupData(activeGroup.id);
    }

    return NextResponse.json({
      success: true,
      groups,
      activeGroup,
      members: groupDetails.members,
      tasks: groupDetails.tasks,
      awayPeriods: groupDetails.awayPeriods,
      allUsers: getAllUsers(),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'create') {
      const { name, adminUserId, timezone } = body;
      const result = createServerGroup(name, adminUserId, timezone);
      if (!result.success) {
        return NextResponse.json(result, { status: 400 });
      }
      return NextResponse.json(result);
    }

    if (action === 'join') {
      const { code, userId, userProfile, clientKnownGroups } = body;
      const result = joinServerGroupByCode(code, userId, userProfile, clientKnownGroups);
      if (!result.success) {
        return NextResponse.json(result, { status: 400 });
      }
      return NextResponse.json(result);
    }

    if (action === 'regenerate_code') {
      const { groupId } = body;
      const newCode = regenerateServerInviteCode(groupId);
      return NextResponse.json({ success: Boolean(newCode), invite_code: newCode });
    }

    if (action === 'transfer_admin') {
      const { groupId, newAdminUserId } = body;
      const success = transferServerAdmin(groupId, newAdminUserId);
      return NextResponse.json({ success });
    }

    if (action === 'sync') {
      const { localUsers, localGroups, localMembers, localTasks, localAway } = body;
      const result = syncLocalDataToServer({
        users: localUsers,
        groups: localGroups,
        members: localMembers,
        tasks: localTasks,
        awayPeriods: localAway,
      });
      return NextResponse.json(result);
    }

    if (action === 'delete') {
      const { groupId, userId } = body;
      const { deleteServerGroup } = await import('@/lib/server-db');
      const result = deleteServerGroup(groupId, userId);
      if (!result.success) {
        return NextResponse.json(result, { status: 400 });
      }
      return NextResponse.json(result);
    }

    if (action === 'leave') {
      const { groupId, userId } = body;
      const { leaveServerGroup } = await import('@/lib/server-db');
      const result = leaveServerGroup(groupId, userId);
      if (!result.success) {
        return NextResponse.json(result, { status: 400 });
      }
      return NextResponse.json(result);
    }

    return NextResponse.json({ success: false, message: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
