'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { backendFetch, BackendError } from '@/lib/backend';
import { getAccessToken } from '@/lib/session';
import {
  createIncomeSchema,
  editIncomeSchema,
  type CreateIncomeValues,
  type EditIncomeValues,
} from '@/lib/validators/income';

interface ActionResult {
  success: boolean;
  message?: string;
}

export async function createIncomeAction(values: CreateIncomeValues): Promise<ActionResult> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect('/login');
  }

  const parsed = createIncomeSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, message: 'Datos inválidos' };
  }

  try {
    await backendFetch('/incomes', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        ...parsed.data,
        description: parsed.data.description || undefined,
      }),
    });
  } catch (error) {
    if (error instanceof BackendError) {
      return { success: false, message: error.message };
    }
    return { success: false, message: 'No se pudo conectar con el servidor' };
  }

  revalidatePath('/incomes');
  revalidatePath('/dashboard');
  redirect('/incomes');
}

export async function updateIncomeAction(
  incomeId: string,
  values: EditIncomeValues,
): Promise<ActionResult> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect('/login');
  }

  const parsed = editIncomeSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, message: 'Datos inválidos' };
  }

  try {
    await backendFetch(`/incomes/${incomeId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        ...parsed.data,
        description: parsed.data.description || undefined,
      }),
    });
  } catch (error) {
    if (error instanceof BackendError) {
      return { success: false, message: error.message };
    }
    return { success: false, message: 'No se pudo conectar con el servidor' };
  }

  revalidatePath('/incomes');
  revalidatePath('/dashboard');
  redirect('/incomes');
}

export async function deleteIncomeAction(incomeId: string) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect('/login');
  }

  await backendFetch(`/incomes/${incomeId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  revalidatePath('/incomes');
  revalidatePath('/dashboard');
  redirect('/incomes');
}
