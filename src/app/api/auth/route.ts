import { NextResponse } from 'next/server';
import {
  findUserByCredentials,
  registerServerUser,
  getAllUsers,
  getDatabase,
} from '@/lib/server-db';

export async function GET() {
  try {
    const users = getAllUsers();
    return NextResponse.json({ success: true, users });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'login') {
      const { usernameOrEmail, password } = body;
      const user = findUserByCredentials(usernameOrEmail, password);
      if (!user) {
        return NextResponse.json(
          { success: false, message: 'Invalid username/email or password.' },
          { status: 401 }
        );
      }
      return NextResponse.json({ success: true, user });
    }

    if (action === 'register') {
      const { name, username, password, email } = body;
      const result = registerServerUser(name, username, password, email);
      if (!result.success) {
        return NextResponse.json(result, { status: 400 });
      }
      return NextResponse.json(result);
    }

    if (action === 'me') {
      const { userId } = body;
      const db = getDatabase();
      const user = db.users.find((u) => u.id === userId);
      if (!user) {
        return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, user });
    }

    return NextResponse.json({ success: false, message: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
