import webpush from 'web-push';

const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.PUSH_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY || process.env.PUSH_PRIVATE_KEY;
const siteSubject = process.env.NEXT_PUBLIC_SITE_URL || 'mailto:notifications@heychores.app';

if (publicVapidKey && privateVapidKey) {
  try {
    webpush.setVapidDetails(siteSubject, publicVapidKey, privateVapidKey);
  } catch (err) {
    console.warn('Failed to configure web-push VAPID details:', err);
  }
}

export function isPushConfigured(): boolean {
  return Boolean(publicVapidKey && privateVapidKey);
}

export async function sendWebPushNotification(
  subscription: webpush.PushSubscription,
  payload: { title: string; body: string; url?: string; tag?: string }
) {
  if (!isPushConfigured()) {
    console.log('[WebPush Mock] Notification sent to subscription:', payload);
    return { success: true, mocked: true };
  }

  try {
    const result = await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        data: {
          url: payload.url || '/',
        },
        tag: payload.tag || 'chore-reminder',
      })
    );
    return { success: true, statusCode: result.statusCode };
  } catch (err: unknown) {
    console.error('Web push send error:', err);
    return { success: false, error: err };
  }
}
