'use server';

import { redirect } from 'next/navigation';
import { backendFetch, BackendError } from '@/lib/backend';
import { setSessionCookies } from '@/lib/session';
import { loginSchema, type LoginValues } from '@/lib/validators/auth';

interface LoginResult {
  success: boolean;
  message?: string;
}

export async function loginAction(values: LoginValues): Promise<LoginResult> {
  const parsed = loginSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, message: 'Datos inválidos' };
  }

  try {
    const data = (await backendFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify(parsed.data),
    })) as { accessToken: string; refreshToken: string };

    await setSessionCookies(data.accessToken, data.refreshToken);
  } catch (error) {
    if (error instanceof BackendError) {
      return { success: false, message: error.message };
    }
    return { success: false, message: 'No se pudo conectar con el servidor' };
  }

  redirect('/dashboard');
}
