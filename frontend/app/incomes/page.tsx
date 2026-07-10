import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { backendFetch, BackendError } from '@/lib/backend';
import { getAccessToken } from '@/lib/session';
import { formatMoney } from '@/lib/money';
import { formatDueDate } from '@/lib/period-label';
import { INCOME_TYPE_LABEL } from '@/lib/categories';
import { deleteIncomeAction } from './actions';

interface Income {
  id: string;
  type: 'SALARY' | 'FREELANCE' | 'OTHER';
  currency: 'USD' | 'DOP';
  amount: string;
  description: string | null;
  period: string;
  receivedAt: string;
}

interface Balance {
  remainingUsd: string;
}

export default async function IncomesPage() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect('/login');
  }

  let incomes: Income[];
  try {
    incomes = await backendFetch('/incomes', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch (error) {
    if (error instanceof BackendError && error.status === 401) {
      redirect('/login');
    }
    throw error;
  }

  const usdBalances = new Map<string, string>();
  await Promise.all(
    incomes
      .filter((income) => income.currency === 'USD')
      .map(async (income) => {
        const balance: Balance = await backendFetch(`/conversions/balance/${income.id}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        usdBalances.set(income.id, balance.remainingUsd);
      }),
  );

  return (
    <main className="min-h-screen bg-muted/40 p-4">
      <div className="mx-auto max-w-2xl space-y-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Ingresos</h1>
          <Link href="/dashboard" className="text-sm underline underline-offset-4">
            Volver al dashboard
          </Link>
        </div>

        <Button className="w-full" nativeButton={false} render={<Link href="/incomes/new" />}>
          Nuevo ingreso
        </Button>

        {incomes.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            Todavía no has registrado ingresos.
          </p>
        )}

        <div className="space-y-2">
          {incomes.map((income) => (
            <Card key={income.id}>
              <CardContent className="flex items-center justify-between gap-3 pt-6 text-sm">
                <div className="min-w-0 space-y-1">
                  <p className="font-medium">
                    {INCOME_TYPE_LABEL[income.type]}
                    {income.description ? ` · ${income.description}` : ''}
                  </p>
                  <p className="text-muted-foreground">
                    {formatDueDate(income.receivedAt)} · {income.period}
                  </p>
                  {income.currency === 'USD' && (
                    <p className="text-xs text-muted-foreground">
                      Restante por convertir: {formatMoney(usdBalances.get(income.id) ?? '0', 'USD')}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{formatMoney(income.amount, income.currency)}</span>
                  {income.currency === 'USD' && (
                    <Button
                      variant="outline"
                      size="sm"
                      nativeButton={false}
                      render={<Link href={`/incomes/${income.id}/convert`} />}
                    >
                      Convertir
                    </Button>
                  )}
                  <form action={deleteIncomeAction.bind(null, income.id)}>
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
