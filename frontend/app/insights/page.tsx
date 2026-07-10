import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { backendFetch, BackendError } from '@/lib/backend';
import { getAccessToken } from '@/lib/session';
import { formatPeriodLabel } from '@/lib/period-label';
import { SEVERITY_LABEL, SEVERITY_VARIANT, type Severity } from '@/lib/severity';
import { dismissInsightAction } from './actions';

interface Insight {
  id: string;
  type: string;
  message: string;
  severity: Severity;
  period: string;
  dismissedAt: string | null;
}

function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function shiftPeriod(period: string, delta: number): string {
  const [year, month] = period.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect('/login');
  }

  const { period: periodParam } = await searchParams;
  const period = periodParam ?? currentPeriod();

  let insights: Insight[];
  try {
    insights = await backendFetch(`/ai-insights?period=${period}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch (error) {
    if (error instanceof BackendError && error.status === 401) {
      redirect('/login');
    }
    throw error;
  }

  const active = insights.filter((insight) => !insight.dismissedAt);
  const dismissed = insights.filter((insight) => insight.dismissedAt);

  return (
    <main className="min-h-screen bg-muted/40 p-4">
      <div className="mx-auto max-w-2xl space-y-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Recomendaciones</h1>
          <Link href="/dashboard" className="text-sm underline underline-offset-4">
            Volver al dashboard
          </Link>
        </div>

        <div className="flex items-center justify-between">
          <Link
            href={`/insights?period=${shiftPeriod(period, -1)}`}
            className="text-sm underline underline-offset-4"
          >
            ← Mes anterior
          </Link>
          <h2 className="text-sm font-medium capitalize text-muted-foreground">
            {formatPeriodLabel(period)}
          </h2>
          <Link
            href={`/insights?period=${shiftPeriod(period, 1)}`}
            className="text-sm underline underline-offset-4"
          >
            Mes siguiente →
          </Link>
        </div>

        {active.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            No hay recomendaciones nuevas para este mes. Vuelve cuando tengas más movimientos
            registrados.
          </p>
        )}

        <div className="space-y-3">
          {active.map((insight) => (
            <Card key={insight.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <Badge variant={SEVERITY_VARIANT[insight.severity]}>
                    {SEVERITY_LABEL[insight.severity]}
                  </Badge>
                  <form action={dismissInsightAction.bind(null, insight.id)}>
                    <Button type="submit" variant="ghost" size="sm">
                      Descartar
                    </Button>
                  </form>
                </div>
                <CardTitle className="text-base font-normal leading-snug">
                  {insight.message}
                </CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>

        {dismissed.length > 0 && (
          <details className="text-sm text-muted-foreground">
            <summary className="cursor-pointer">
              {dismissed.length} recomendación(es) descartada(s)
            </summary>
            <div className="mt-2 space-y-2">
              {dismissed.map((insight) => (
                <p key={insight.id} className="rounded-md border p-2 opacity-60">
                  {insight.message}
                </p>
              ))}
            </div>
          </details>
        )}
      </div>
    </main>
  );
}
