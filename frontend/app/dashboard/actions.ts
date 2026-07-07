'use server';

import { redirect } from 'next/navigation';
import { backendFetch } from '@/lib/backend';
import { clearSessionCookies, getRefreshToken } from '@/lib/session';

export async function logoutAction() {
  const refreshToken = await getRefreshToken();
  if (refreshToken) {
    await backendFetch('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }).catch(() => undefined);
  }

  await clearSessionCookies();
  redirect('/login');
}
