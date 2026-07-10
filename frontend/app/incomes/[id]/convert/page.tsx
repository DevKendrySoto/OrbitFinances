import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { backendFetch, BackendError } from '@/lib/backend';
import { getAccessToken } from '@/lib/session';
import { formatMoney } from '@/lib/money';
import { formatDueDate } from '@/lib/period-label';
import { ConversionForm } from '@/components/conversion-form';

interface Income {
  id: string;
  currency: 'USD' | 'DOP';
  amount: string;
  description: string | null;
}

interface Balance {
  incomeId: string;
  totalUsd: string;
  remainingUsd: string;
  convertedUsd: string;
}

interface Conversion {
  id: string;
  amountUsd: string;
  exchangeRate: string;
  amountDop: string;
  convertedAt: string;
}

export default async function ConvertIncomePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect('/login');
  }

  const { id } = await params;

  let income: Income;
  let balance: Balance;
  let conversions: Conversion[];
  try {
    [income, balance, conversions] = await Promise.all([
      backendFetch(`/incomes/${id}`, { headers: { Authorization: `Bearer ${accessToken}` } }),
      backendFetch(`/conversions/balance/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
      backendFetch(`/conversions?incomeId=${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    ]);
  } catch (error) {
    if (error instanceof BackendError && error.status === 401) {
      redirect('/login');
    }
    if (error instanceof BackendError && error.status === 400) {
      redirect('/incomes');
    }
    throw error;
  }

  return (
    <main className="min-h-screen bg-muted/40 p-4">
      <div className="mx-auto max-w-2xl space-y-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Convertir a DOP</h1>
          <Link href="/incomes" className="text-sm underline underline-offset-4">
            Volver a ingresos
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardDescription>{income.description ?? 'Ingreso en USD'}</CardDescription>
            <CardTitle className="text-2xl">{formatMoney(balance.remainingUsd, 'USD')}</CardTitle>
            <CardDescription>
              disponible de {formatMoney(balance.totalUsd, 'USD')} · ya convertido{' '}
              {formatMoney(balance.convertedUsd, 'USD')}
            </CardDescription>
          </CardHeader>
        </Card>

        {balance.remainingUsd !== '0' ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Nueva conversión</CardTitle>
            </CardHeader>
            <CardContent>
              <ConversionForm incomeId={id} />
            </CardContent>
          </Card>
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            Ya convertiste todo el saldo de este ingreso.
          </p>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Historial</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {conversions.length === 0 && (
              <p className="text-sm text-muted-foreground">Sin conversiones todavía.</p>
            )}
            {conversions.map((conversion) => (
              <div
                key={conversion.id}
                className="flex items-center justify-between rounded-md border p-3 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {formatMoney(conversion.amountUsd, 'USD')} → {formatMoney(conversion.amountDop, 'DOP')}
                  </p>
                  <p className="text-muted-foreground">
                    {formatDueDate(conversion.convertedAt)} · tasa {conversion.exchangeRate}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
