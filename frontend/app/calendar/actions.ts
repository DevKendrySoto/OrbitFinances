'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { backendFetch } from '@/lib/backend';
import { getAccessToken } from '@/lib/session';

export async function payOccurrenceAction(occurrenceId: string) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect('/login');
  }

  await backendFetch(`/recurring-payments/occurrences/${occurrenceId}/pay`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({}),
  });

  revalidatePath('/calendar');
  redirect('/calendar');
}
