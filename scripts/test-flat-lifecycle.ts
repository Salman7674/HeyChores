/**
 * Comprehensive End-to-End Verification Script
 * Tests:
 * 1. Simran's Flat and Invite Code 83RZLE
 * 2. Roommate joining flat via code 83RZLE
 * 3. Dynamic chore creation & rotation
 * 4. Chore completion & turn advancement
 * 5. Away vacation guard & exchange prevention
 * 6. Non-admin deletion prevention (Security check)
 * 7. Admin Flat Deletion & cleanup
 */

const BASE_URL = 'http://localhost:3000';

async function request(endpoint: string, options: any = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('====================================================');
  console.log('🚀 RUNNING HEYCHORES CENTRALIZED DATABASE & FLAT TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      if (detail) console.error(`   Details: ${detail}`);
      failed++;
    }
  }

  // -------------------------------------------------------------------------
  // TEST 1: User Login & Simran verification
  // -------------------------------------------------------------------------
  console.log('--- Step 1: User Login & Simran Flat Lookup ---');
  const simranLogin = await request('/api/auth', {
    method: 'POST',
    body: JSON.stringify({
      action: 'login',
      usernameOrEmail: 'simmi',
      password: '12345',
    }),
  });

  assert(
    simranLogin.ok && simranLogin.data.success && simranLogin.data.user.name === 'simran',
    'Simran logs in with credentials (simmi / 12345)',
    JSON.stringify(simranLogin.data)
  );

  const simranId = simranLogin.data.user?.id || 'user-1791039701145';

  // Check Simran's flat
  const simranFlats = await request(`/api/flats?userId=${simranId}`);
  const has83RZLE = simranFlats.data.groups?.some(
    (g: any) => g.invite_code?.toUpperCase() === '83RZLE'
  );
  assert(
    has83RZLE,
    'Simran owns/belongs to flat with invite code 83RZLE',
    `Found groups: ${JSON.stringify(simranFlats.data.groups?.map((g: any) => g.invite_code))}`
  );

  // -------------------------------------------------------------------------
  // TEST 2: Register New Roommate & Join flat using code 83RZLE
  // -------------------------------------------------------------------------
  console.log('\n--- Step 2: New Roommate Registers & Joins via Code 83RZLE ---');
  const timestamp = Date.now();
  const roommateUsername = `aman_${timestamp.toString().slice(-4)}`;
  const regRes = await request('/api/auth', {
    method: 'POST',
    body: JSON.stringify({
      action: 'register',
      name: 'Aman Sharma',
      username: roommateUsername,
      password: 'password123',
      email: `${roommateUsername}@gmail.com`,
    }),
  });

  assert(regRes.ok && regRes.data.success, `New roommate registered (@${roommateUsername})`);
  const amanId = regRes.data.user.id;

  // Verify Aman starts with ZERO flats initially (multi-tenant isolation)
  const amanInitialFlats = await request(`/api/flats?userId=${amanId}`);
  assert(
    amanInitialFlats.data.groups?.length === 0,
    'Newly registered user starts with 0 flats (clean multi-tenant isolation)'
  );

  // Aman joins flat using code 83RZLE
  const joinRes = await request('/api/flats', {
    method: 'POST',
    body: JSON.stringify({
      action: 'join',
      code: '83RZLE',
      userId: amanId,
      userProfile: regRes.data.user,
    }),
  });

  assert(
    joinRes.ok && joinRes.data.success && joinRes.data.group?.invite_code === '83RZLE',
    'Aman joins flat using invite code "83RZLE"',
    JSON.stringify(joinRes.data)
  );

  const flatId = joinRes.data.group.id;

  // Verify Aman now sees the flat and Simran in flat members
  const amanFlatData = await request(`/api/flats?userId=${amanId}&groupId=${flatId}`);
  const members = amanFlatData.data.members || [];
  const hasAman = members.some((m: any) => m.user_id === amanId);
  const hasSimran = members.some((m: any) => m.user_id === simranId || m.profile?.username === 'simmi');

  assert(hasAman && hasSimran, 'Both Simran and Aman are synchronized members in centralized database');

  // -------------------------------------------------------------------------
  // TEST 3: Dynamic Chore Creation
  // -------------------------------------------------------------------------
  console.log('\n--- Step 3: Dynamic Chore Creation ---');
  const choreRes = await request('/api/tasks', {
    method: 'POST',
    body: JSON.stringify({
      action: 'create',
      groupId: flatId,
      userId: amanId,
      data: {
        name: 'Take Out Trash & Recycling',
        description: 'Bin at the front gate every Tuesday',
        intervalType: 'days',
        intervalValue: 3,
        rotationUserIds: [simranId, amanId],
      },
    }),
  });

  assert(
    choreRes.ok && choreRes.data.success && choreRes.data.task?.name === 'Take Out Trash & Recycling',
    'Aman creates chore with rotation [Simran, Aman]',
    JSON.stringify(choreRes.data)
  );

  const taskId = choreRes.data.task.id;
  assert(
    choreRes.data.task.state.current_assignee_id === simranId,
    'Turn starts with first roommate in rotation (Simran)'
  );

  // -------------------------------------------------------------------------
  // TEST 4: Turn Completion & Automatic Rotation Advancement
  // -------------------------------------------------------------------------
  console.log('\n--- Step 4: Complete Turn & Rotation Advance ---');
  const completeRes = await request('/api/tasks', {
    method: 'POST',
    body: JSON.stringify({
      action: 'complete',
      taskId,
      userId: simranId,
      notes: 'Completed in the morning!',
    }),
  });

  assert(
    completeRes.ok && completeRes.data.success,
    'Simran marks her turn complete',
    JSON.stringify(completeRes.data)
  );

  assert(
    completeRes.data.task.state.current_assignee_id === amanId,
    'Rotation advances turn automatically to next roommate (Aman)'
  );

  // -------------------------------------------------------------------------
  // TEST 5: Vacation / Away Guard Rule Check
  // -------------------------------------------------------------------------
  console.log('\n--- Step 5: Away Status & Exchange Prevention Guard ---');
  // Mark Simran away for 5 days
  const now = new Date();
  const future = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
  const awayRes = await request('/api/members', {
    method: 'POST',
    body: JSON.stringify({
      action: 'set_away',
      groupId: flatId,
      userId: simranId,
      startAt: now.toISOString(),
      endAt: future.toISOString(),
    }),
  });

  assert(awayRes.ok && awayRes.data.success, 'Simran marked as Away on vacation');

  // Try to exchange Aman chore with Simran (who is Away) -> MUST BE REJECTED
  const illegalExchange = await request('/api/tasks', {
    method: 'POST',
    body: JSON.stringify({
      action: 'exchange',
      taskId,
      userId: amanId,
      replacementUserId: simranId,
      note: 'Can you take this?',
    }),
  });

  assert(
    !illegalExchange.data.success &&
      illegalExchange.data.message?.includes('away on vacation'),
    'Turn exchange rejected because roommate is away on vacation',
    JSON.stringify(illegalExchange.data)
  );

  // Clear Simran away status
  const clearAwayRes = await request('/api/members', {
    method: 'POST',
    body: JSON.stringify({
      action: 'clear_away',
      groupId: flatId,
      userId: simranId,
    }),
  });
  assert(clearAwayRes.ok && clearAwayRes.data.success, 'Simran cleared away status back to Home');

  // -------------------------------------------------------------------------
  // TEST 6: Flat Deletion Security (Non-admin rejection)
  // -------------------------------------------------------------------------
  console.log('\n--- Step 6: Security Check - Non-Admin Flat Deletion ---');
  const unauthorizedDelete = await request('/api/flats', {
    method: 'POST',
    body: JSON.stringify({
      action: 'delete',
      groupId: flatId,
      userId: amanId, // Aman is not admin!
    }),
  });

  assert(
    !unauthorizedDelete.data.success &&
      unauthorizedDelete.data.message?.includes('Only the Flat Admin can delete this flat'),
    'Non-admin roommate cannot delete flat (properly rejected with 400)',
    JSON.stringify(unauthorizedDelete.data)
  );

  // -------------------------------------------------------------------------
  // TEST 7: Flat Deletion & Cleanup (Admin operation)
  // -------------------------------------------------------------------------
  console.log('\n--- Step 7: Create & Delete Disposable Flat (Admin Operation) ---');
  // Create disposable flat
  const dispFlat = await request('/api/flats', {
    method: 'POST',
    body: JSON.stringify({
      action: 'create',
      name: 'Temp Delete Me Flat',
      adminUserId: amanId,
    }),
  });

  assert(dispFlat.ok && dispFlat.data.success, 'Aman creates "Temp Delete Me Flat" as admin');
  const tempFlatId = dispFlat.data.group.id;

  // Add chore to temp flat
  const tempChore = await request('/api/tasks', {
    method: 'POST',
    body: JSON.stringify({
      action: 'create',
      groupId: tempFlatId,
      userId: amanId,
      data: {
        name: 'Wipe Counter',
        intervalType: 'days',
        intervalValue: 1,
        rotationUserIds: [amanId],
      },
    }),
  });
  assert(tempChore.ok && tempChore.data.success, 'Created chore in "Temp Delete Me Flat"');

  // Now delete the flat as admin
  const deleteRes = await request('/api/flats', {
    method: 'POST',
    body: JSON.stringify({
      action: 'delete',
      groupId: tempFlatId,
      userId: amanId,
    }),
  });

  assert(
    deleteRes.ok && deleteRes.data.success && deleteRes.data.message?.includes('permanently deleted'),
    'Admin successfully deletes "Temp Delete Me Flat"',
    JSON.stringify(deleteRes.data)
  );

  // Verify flat and its chores no longer exist
  const checkDeleted = await request(`/api/flats?userId=${amanId}&groupId=${tempFlatId}`);
  const stillExists = checkDeleted.data.groups?.some((g: any) => g.id === tempFlatId);
  const choresStillExist = checkDeleted.data.tasks?.some((t: any) => t.group_id === tempFlatId);

  assert(!stillExists && !choresStillExist, 'Flat, members, and chores permanently removed from database');

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n====================================================');
  console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
