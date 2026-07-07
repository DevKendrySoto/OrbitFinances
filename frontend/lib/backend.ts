import 'server-only';

const BACKEND_URL = process.env.BACKEND_API_URL ?? 'http://localhost:3000';

export class BackendError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export async function backendFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: 'Error inesperado' }));
    const message = Array.isArray(body.message)
      ? body.message.map((issue: { message: string }) => issue.message).join(', ')
      : (body.message ?? 'Error inesperado');
    throw new BackendError(message, res.status);
  }

  if (res.status === 204) {
    return undefined;
  }

  return res.json();
}
