'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { backendFetch } from '@/lib/backend';
import { getAccessToken } from '@/lib/session';

export async function dismissInsightAction(id: string) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect('/login');
  }

  await backendFetch(`/ai-insights/${id}/dismiss`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  revalidatePath('/insights');
  redirect('/insights');
}
