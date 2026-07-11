'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { backendFetch, BackendError } from '@/lib/backend';
import { getAccessToken } from '@/lib/session';
import {
  createExpenseSchema,
  editExpenseSchema,
  type CreateExpenseValues,
  type EditExpenseValues,
} from '@/lib/validators/expense';

interface ActionResult {
  success: boolean;
  message?: string;
}

export async function createExpenseAction(values: CreateExpenseValues): Promise<ActionResult> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect('/login');
  }

  const parsed = createExpenseSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, message: 'Datos inválidos' };
  }

  try {
    await backendFetch('/expenses', {
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

  revalidatePath('/expenses');
  revalidatePath('/dashboard');
  redirect('/expenses');
}

export async function updateExpenseAction(
  expenseId: string,
  values: EditExpenseValues,
): Promise<ActionResult> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect('/login');
  }

  const parsed = editExpenseSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, message: 'Datos inválidos' };
  }

  try {
    await backendFetch(`/expenses/${expenseId}`, {
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

  revalidatePath('/expenses');
  revalidatePath('/dashboard');
  redirect('/expenses');
}

export async function deleteExpenseAction(expenseId: string) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect('/login');
  }

  try {
    await backendFetch(`/expenses/${expenseId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch (error) {
    if (error instanceof BackendError) {
      redirect(`/expenses?error=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }

  revalidatePath('/expenses');
  revalidatePath('/dashboard');
  redirect('/expenses');
}
