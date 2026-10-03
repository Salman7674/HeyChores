import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseServerConfigured, createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subscription, browser } = body;

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription data' }, { status: 400 });
    }

    if (!isSupabaseServerConfigured()) {
      return NextResponse.json({ success: true, message: 'Saved in local preview' });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Upsert subscription
    const { error } = await supabase
      .from('notification_subscriptions')
      .upsert({
        user_id: user.id,
        subscription_data: subscription,
        browser: browser || 'Unknown',
        created_at: new Date().toISOString(),
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
