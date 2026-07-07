import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { backendFetch, BackendError } from '@/lib/backend';
import { getAccessToken } from '@/lib/session';
import { formatMoney } from '@/lib/money';
import { formatPeriodLabel } from '@/lib/period-label';
import { ClosingForm } from '@/components/closing-form';

interface MonthlyClosing {
  id: string;
  period: string;
  totalIncome: string;
  totalExpenses: string;
  totalPayments: string;
  availableReal: string;
  savingsTotal: string;
  closedAt: string;
}

export default async function ClosingsPage() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect('/login');
  }

  let closings: MonthlyClosing[];
  try {
    closings = await backendFetch('/reports/closings', {
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
          <h1 className="text-2xl font-semibold">Cierres mensuales</h1>
          <Link href="/reports" className="text-sm underline underline-offset-4">
            Volver a reportes
          </Link>
        </div>

        <Card>
          <CardContent className="pt-6">
            <ClosingForm />
            <p className="mt-2 text-xs text-muted-foreground">
              Un cierre es definitivo: una vez creado para un mes, no se puede editar ni volver a
              generar.
            </p>
          </CardContent>
        </Card>

        {closings.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            Todavía no hay cierres mensuales.
          </p>
        )}

        {closings.map((closing) => (
          <Card key={closing.id}>
            <CardHeader>
              <CardTitle className="text-lg capitalize">
                {formatPeriodLabel(closing.period)}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground">Ingresos</p>
                <p className="font-medium">{formatMoney(closing.totalIncome, 'DOP')}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Gastos</p>
                <p className="font-medium">{formatMoney(closing.totalExpenses, 'DOP')}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Pagos</p>
                <p className="font-medium">{formatMoney(closing.totalPayments, 'DOP')}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Disponible real</p>
                <p className="font-medium">{formatMoney(closing.availableReal, 'DOP')}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Ahorrado este mes</p>
                <p className="font-medium">{formatMoney(closing.savingsTotal, 'DOP')}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
