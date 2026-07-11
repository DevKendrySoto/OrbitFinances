import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { backendFetch, BackendError } from '@/lib/backend';
import { getAccessToken } from '@/lib/session';
import { formatMoney } from '@/lib/money';
import { formatDueDate } from '@/lib/period-label';
import { EXPENSE_CATEGORY_LABEL } from '@/lib/categories';
import { deleteExpenseAction } from './actions';

interface Expense {
  id: string;
  category: string;
  currency: 'USD' | 'DOP';
  amount: string;
  description: string | null;
  spentAt: string;
}

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect('/login');
  }

  const { error: errorMessage } = await searchParams;

  let expenses: Expense[];
  try {
    expenses = await backendFetch('/expenses', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch (error) {
    if (error instanceof BackendError && error.status === 401) {
      redirect('/login');
    }
    throw error;
  }

  return (
    <main className="min-h-screen bg-muted/40 p-4">
      <div className="mx-auto max-w-2xl space-y-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Gastos</h1>
          <Link href="/dashboard" className="text-sm underline underline-offset-4">
            Volver al dashboard
          </Link>
        </div>

        <Button className="w-full" nativeButton={false} render={<Link href="/expenses/new" />}>
          Nuevo gasto
        </Button>

        {errorMessage && (
          <p className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {errorMessage}
          </p>
        )}

        {expenses.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            Todavía no has registrado gastos.
          </p>
        )}

        <div className="space-y-2">
          {expenses.map((expense) => (
            <Card key={expense.id}>
              <CardContent className="flex items-center justify-between gap-3 pt-6 text-sm">
                <div className="min-w-0 space-y-1">
                  <p className="font-medium">
                    {EXPENSE_CATEGORY_LABEL[expense.category] ?? expense.category}
                    {expense.description ? ` · ${expense.description}` : ''}
                  </p>
                  <p className="text-muted-foreground">{formatDueDate(expense.spentAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium">
                    {formatMoney(expense.amount, expense.currency)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    nativeButton={false}
                    render={<Link href={`/expenses/${expense.id}/edit`} />}
                  >
                    Editar
                  </Button>
                  <form action={deleteExpenseAction.bind(null, expense.id)}>
                    <Button type="submit" variant="outline" size="sm">
                      Eliminar
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
