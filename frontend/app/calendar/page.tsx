import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { backendFetch, BackendError } from '@/lib/backend';
import { getAccessToken } from '@/lib/session';
import { formatDueDate, formatPeriodLabel } from '@/lib/period-label';
import { payOccurrenceAction } from './actions';

type Priority = 'CRITICAL' | 'IMPORTANT' | 'OPTIONAL';

interface Occurrence {
  id: string;
  period: string;
  dueDate: string;
  amount: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  recurringPayment: {
    name: string;
    category: string | null;
    priority: Priority;
    currency: 'USD' | 'DOP';
  };
}

const PRIORITY_VARIANT: Record<Priority, 'destructive' | 'default' | 'secondary'> = {
  CRITICAL: 'destructive',
  IMPORTANT: 'default',
  OPTIONAL: 'secondary',
};

const PRIORITY_LABEL: Record<Priority, string> = {
  CRITICAL: 'Crítico',
  IMPORTANT: 'Importante',
  OPTIONAL: 'Opcional',
};

function OccurrenceRow({ occurrence, overdue }: { occurrence: Occurrence; overdue: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm">
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium">{occurrence.recurringPayment.name}</p>
          <Badge variant={PRIORITY_VARIANT[occurrence.recurringPayment.priority]}>
            {PRIORITY_LABEL[occurrence.recurringPayment.priority]}
          </Badge>
          {overdue && <Badge variant="destructive">Vencido</Badge>}
        </div>
        <p className="text-muted-foreground">
          {formatDueDate(occurrence.dueDate)} · {occurrence.amount}{' '}
          {occurrence.recurringPayment.currency}
        </p>
      </div>
      <form action={payOccurrenceAction.bind(null, occurrence.id)}>
        <Button type="submit" size="sm" variant={overdue ? 'default' : 'outline'}>
          Marcar pagado
        </Button>
      </form>
    </div>
  );
}

export default async function CalendarPage() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect('/login');
  }

  let occurrences: Occurrence[];
  try {
    occurrences = await backendFetch('/recurring-payments/occurrences?status=PENDING', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch (error) {
    if (error instanceof BackendError && error.status === 401) {
      redirect('/login');
    }
    throw error;
  }

  const todayUtc = new Date(
    Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()),
  );

  const overdue = occurrences.filter((o) => new Date(o.dueDate) < todayUtc);
  const upcoming = occurrences.filter((o) => new Date(o.dueDate) >= todayUtc);

  const upcomingByPeriod = new Map<string, Occurrence[]>();
  for (const occurrence of upcoming) {
    const bucket = upcomingByPeriod.get(occurrence.period) ?? [];
    bucket.push(occurrence);
    upcomingByPeriod.set(occurrence.period, bucket);
  }

  return (
    <main className="min-h-screen bg-muted/40 p-4">
      <div className="mx-auto max-w-2xl space-y-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Calendario financiero</h1>
          <Link href="/dashboard" className="text-sm underline underline-offset-4">
            Volver al dashboard
          </Link>
        </div>

        {overdue.length > 0 && (
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-lg text-destructive">
                Pagos vencidos ({overdue.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {overdue.map((occurrence) => (
                <OccurrenceRow key={occurrence.id} occurrence={occurrence} overdue />
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Próximos pagos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {upcomingByPeriod.size === 0 && (
              <p className="text-sm text-muted-foreground">No hay pagos pendientes.</p>
            )}
            {Array.from(upcomingByPeriod.entries()).map(([period, items]) => (
              <div key={period} className="space-y-2">
                <h2 className="text-sm font-medium capitalize text-muted-foreground">
                  {formatPeriodLabel(period)}
                </h2>
                <div className="space-y-2">
                  {items.map((occurrence) => (
                    <OccurrenceRow key={occurrence.id} occurrence={occurrence} overdue={false} />
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
