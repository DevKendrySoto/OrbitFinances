'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { backendFetch, BackendError } from '@/lib/backend';
import { getAccessToken } from '@/lib/session';

interface ActionResult {
  success: boolean;
  message?: string;
}

export async function createClosingAction(month: string): Promise<ActionResult> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect('/login');
  }

  try {
    await backendFetch('/reports/closings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ month }),
    });
  } catch (error) {
    if (error instanceof BackendError) {
      return { success: false, message: error.message };
    }
    return { success: false, message: 'No se pudo conectar con el servidor' };
  }

  revalidatePath('/reports/closings');
  redirect('/reports/closings');
}
