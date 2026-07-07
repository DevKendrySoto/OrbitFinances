import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { backendFetch, BackendError } from '@/lib/backend';
import { getAccessToken } from '@/lib/session';
import { formatMoney } from '@/lib/money';
import { formatDueDate, formatPeriodLabel } from '@/lib/period-label';
import { PRIORITY_LABEL, PRIORITY_VARIANT, type Priority } from '@/lib/priority';
import { logoutAction } from './actions';

interface Membership {
  householdId: string;
  householdName: string;
  role: string;
}

interface Profile {
  id: string;
  email: string;
  name: string;
  memberships: Membership[];
}

interface CurrencyTotals {
  DOP: string;
  USD: string;
}

interface UpcomingPayment {
  id: string;
  dueDate: string;
  amount: string;
  recurringPayment: { name: string; priority: Priority; currency: 'USD' | 'DOP' };
}

interface DashboardSummary {
  period: string;
  income: CurrencyTotals;
  committed: CurrencyTotals;
  expenses: CurrencyTotals;
  availableReal: CurrencyTotals;
  savingsUsd: string;
  monthStatus: 'ok' | 'warning' | 'critical';
  upcomingPayments: UpcomingPayment[];
}

const STATUS_CONFIG = {
  ok: { label: 'Mes en orden', variant: 'secondary' as const },
  warning: { label: 'Disponible bajo', variant: 'outline' as const },
  critical: { label: 'Riesgo de sobregasto', variant: 'destructive' as const },
};

export default async function DashboardPage() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect('/login');
  }

  let profile: Profile;
  let summary: DashboardSummary;
  try {
    [profile, summary] = await Promise.all([
      backendFetch('/auth/me', { headers: { Authorization: `Bearer ${accessToken}` } }),
      backendFetch('/dashboard/summary', { headers: { Authorization: `Bearer ${accessToken}` } }),
    ]);
  } catch (error) {
    if (error instanceof BackendError && error.status === 401) {
      redirect('/login');
    }
    throw error;
  }

  const household = profile.memberships?.[0];
  const status = STATUS_CONFIG[summary.monthStatus];
  const hasUsdActivity = summary.income.USD !== '0' || summary.savingsUsd !== '0';

  return (
    <main className="min-h-screen bg-muted/40 p-4">
      <div className="mx-auto max-w-2xl space-y-6 py-8">
        <div>
          <p className="text-sm text-muted-foreground">
            Hola, {profile.name} · {household?.householdName}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <h1 className="text-2xl font-semibold capitalize">
              {formatPeriodLabel(summary.period)}
            </h1>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardDescription>Disponible real</CardDescription>
              <CardTitle className="text-2xl">
                {formatMoney(summary.availableReal.DOP, 'DOP')}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Comprometido</CardDescription>
              <CardTitle className="text-2xl">
                {formatMoney(summary.committed.DOP, 'DOP')}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Ingresos del mes</CardDescription>
              <CardTitle className="text-2xl">{formatMoney(summary.income.DOP, 'DOP')}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Gastos variables</CardDescription>
              <CardTitle className="text-2xl">
                {formatMoney(summary.expenses.DOP, 'DOP')}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {hasUsdActivity && (
          <Card>
            <CardHeader>
              <CardDescription>Ahorro en USD sin convertir</CardDescription>
              <CardTitle className="text-2xl">
                {formatMoney(summary.savingsUsd, 'USD')}
              </CardTitle>
            </CardHeader>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Próximos pagos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {summary.upcomingPayments.length === 0 && (
              <p className="text-sm text-muted-foreground">No hay pagos pendientes.</p>
            )}
            {summary.upcomingPayments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between rounded-md border p-3 text-sm"
              >
                <div className="flex items-center gap-2">
                  <p className="font-medium">{payment.recurringPayment.name}</p>
                  <Badge variant={PRIORITY_VARIANT[payment.recurringPayment.priority]}>
                    {PRIORITY_LABEL[payment.recurringPayment.priority]}
                  </Badge>
                </div>
                <p className="text-muted-foreground">
                  {formatDueDate(payment.dueDate)} ·{' '}
                  {formatMoney(payment.amount, payment.recurringPayment.currency)}
                </p>
              </div>
            ))}
            <Button
              variant="outline"
              className="w-full"
              nativeButton={false}
              render={<Link href="/calendar" />}
            >
              Ver calendario completo
            </Button>
          </CardContent>
        </Card>

        <form action={logoutAction}>
          <Button type="submit" variant="outline" className="w-full">
            Cerrar sesión
          </Button>
        </form>
      </div>
    </main>
  );
}
