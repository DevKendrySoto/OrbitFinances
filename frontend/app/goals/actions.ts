'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { backendFetch, BackendError } from '@/lib/backend';
import { getAccessToken } from '@/lib/session';
import {
  createGoalSchema,
  editGoalSchema,
  type CreateGoalValues,
  type EditGoalValues,
} from '@/lib/validators/goal';

interface ActionResult {
  success: boolean;
  message?: string;
}

export async function createGoalAction(values: CreateGoalValues): Promise<ActionResult> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect('/login');
  }

  const parsed = createGoalSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, message: 'Datos inválidos' };
  }

  try {
    await backendFetch('/goals', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        ...parsed.data,
        targetDate: parsed.data.targetDate || undefined,
      }),
    });
  } catch (error) {
    if (error instanceof BackendError) {
      return { success: false, message: error.message };
    }
    return { success: false, message: 'No se pudo conectar con el servidor' };
  }

  revalidatePath('/goals');
  redirect('/goals');
}

export async function updateGoalAction(
  goalId: string,
  values: EditGoalValues,
): Promise<ActionResult> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect('/login');
  }

  const parsed = editGoalSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, message: 'Datos inválidos' };
  }

  try {
    await backendFetch(`/goals/${goalId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        ...parsed.data,
        targetDate: parsed.data.targetDate || undefined,
      }),
    });
  } catch (error) {
    if (error instanceof BackendError) {
      return { success: false, message: error.message };
    }
    return { success: false, message: 'No se pudo conectar con el servidor' };
  }

  revalidatePath('/goals');
  redirect('/goals');
}

export async function addContributionAction(goalId: string, formData: FormData) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect('/login');
  }

  const amount = Number(formData.get('amount'));
  const currency = formData.get('currency');

  await backendFetch(`/goals/${goalId}/contributions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ amount, currency }),
  });

  revalidatePath('/goals');
  redirect('/goals');
}

export async function setGoalStatusAction(
  goalId: string,
  status: 'PAUSED' | 'IN_PROGRESS',
) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect('/login');
  }

  await backendFetch(`/goals/${goalId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ status }),
  });

  revalidatePath('/goals');
  redirect('/goals');
}
