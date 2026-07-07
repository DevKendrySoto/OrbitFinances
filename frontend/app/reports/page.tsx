import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { backendFetch, BackendError } from '@/lib/backend';
import { getAccessToken } from '@/lib/session';
import { formatMoney } from '@/lib/money';
import { today, daysAgo, firstDayOfMonth } from '@/lib/date-range';
import { EXPENSE_CATEGORY_LABEL, INCOME_TYPE_LABEL } from '@/lib/categories';

interface CurrencyTotals {
  DOP: string;
  USD: string;
}

interface CategoryTotal extends CurrencyTotals {
  key: string;
}

interface RangeReport {
  from: string;
  to: string;
  totals: { income: CurrencyTotals; expenses: CurrencyTotals; paid: CurrencyTotals };
  byExpenseCategory: CategoryTotal[];
  byIncomeType: CategoryTotal[];
  incomes: unknown[];
  expenses: unknown[];
  payments: unknown[];
}

const QUICK_RANGES = [
  { label: 'Hoy', from: today(), to: today() },
  { label: 'Últimos 15 días', from: daysAgo(15), to: today() },
  { label: 'Este mes', from: firstDayOfMonth(), to: today() },
  { label: 'Últimos 90 días', from: daysAgo(90), to: today() },
];

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect('/login');
  }

  const params = await searchParams;
  const from = params.from ?? firstDayOfMonth();
  const to = params.to ?? today();

  let report: RangeReport;
  try {
    report = await backendFetch(`/reports?from=${from}&to=${to}`, {
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
          <h1 className="text-2xl font-semibold">Reportes</h1>
          <div className="flex gap-3 text-sm">
            <Link href="/reports/closings" className="underline underline-offset-4">
              Cierres mensuales
            </Link>
            <Link href="/dashboard" className="underline underline-offset-4">
              Volver al dashboard
            </Link>
          </div>
        </div>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex flex-wrap gap-2">
              {QUICK_RANGES.map((range) => (
                <Button
                  key={range.label}
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={<Link href={`/reports?from=${range.from}&to=${range.to}`} />}
                >
                  {range.label}
                </Button>
              ))}
            </div>

            <form method="get" className="flex items-end gap-2">
              <div className="space-y-1">
                <Label htmlFor="from">Desde</Label>
                <Input id="from" name="from" type="date" defaultValue={from} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="to">Hasta</Label>
                <Input id="to" name="to" type="date" defaultValue={to} required />
              </div>
              <Button type="submit" size="sm">
                Ver
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardDescription>Ingresos</CardDescription>
              <CardTitle className="text-xl">
                {formatMoney(report.totals.income.DOP, 'DOP')}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Gastos</CardDescription>
              <CardTitle className="text-xl">
                {formatMoney(report.totals.expenses.DOP, 'DOP')}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Pagos pagados</CardDescription>
              <CardTitle className="text-xl">
                {formatMoney(report.totals.paid.DOP, 'DOP')}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Gastos por categoría</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {report.byExpenseCategory.length === 0 && (
              <p className="text-sm text-muted-foreground">Sin gastos en este período.</p>
            )}
            {report.byExpenseCategory.map((item) => (
              <div key={item.key} className="flex justify-between text-sm">
                <span>{EXPENSE_CATEGORY_LABEL[item.key] ?? item.key}</span>
                <span className="text-muted-foreground">{formatMoney(item.DOP, 'DOP')}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ingresos por tipo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {report.byIncomeType.length === 0 && (
              <p className="text-sm text-muted-foreground">Sin ingresos en este período.</p>
            )}
            {report.byIncomeType.map((item) => (
              <div key={item.key} className="flex justify-between text-sm">
                <span>{INCOME_TYPE_LABEL[item.key] ?? item.key}</span>
                <span className="text-muted-foreground">{formatMoney(item.DOP, 'DOP')}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
