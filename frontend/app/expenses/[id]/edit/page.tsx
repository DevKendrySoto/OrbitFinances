import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ExpenseForm } from '@/components/expense-form';
import { backendFetch, BackendError } from '@/lib/backend';
import { getAccessToken } from '@/lib/session';

interface Expense {
  id: string;
  category: string;
  currency: 'USD' | 'DOP';
  amount: string;
  spentAt: string;
  description: string | null;
}

export default async function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect('/login');
  }

  const { id } = await params;

  let expense: Expense;
  try {
    expense = await backendFetch(`/expenses/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch (error) {
    if (error instanceof BackendError && error.status === 401) {
      redirect('/login');
    }
    if (error instanceof BackendError && error.status === 404) {
      redirect('/expenses');
    }
    throw error;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Editar gasto</CardTitle>
          <CardDescription>Corrige los datos de este gasto</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ExpenseForm expense={expense} />
          <Link
            href="/expenses"
            className="block text-center text-sm text-muted-foreground underline underline-offset-4"
          >
            Volver a gastos
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
