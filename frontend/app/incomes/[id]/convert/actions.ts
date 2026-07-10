'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { backendFetch, BackendError } from '@/lib/backend';
import { getAccessToken } from '@/lib/session';
import {
  createConversionSchema,
  type CreateConversionValues,
} from '@/lib/validators/conversion';

interface ActionResult {
  success: boolean;
  message?: string;
}

export async function createConversionAction(
  incomeId: string,
  values: CreateConversionValues,
): Promise<ActionResult> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect('/login');
  }

  const parsed = createConversionSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, message: 'Datos inválidos' };
  }

  try {
    await backendFetch('/conversions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ incomeId, ...parsed.data }),
    });
  } catch (error) {
    if (error instanceof BackendError) {
      return { success: false, message: error.message };
    }
    return { success: false, message: 'No se pudo conectar con el servidor' };
  }

  revalidatePath(`/incomes/${incomeId}/convert`);
  redirect(`/incomes/${incomeId}/convert`);
}
