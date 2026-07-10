import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { backendFetch, BackendError } from '@/lib/backend';
import { getAccessToken } from '@/lib/session';
import { formatMoney } from '@/lib/money';
import { GOAL_STATUS_LABEL, GOAL_STATUS_VARIANT, type GoalStatus } from '@/lib/goal-status';
import { addContributionAction, setGoalStatusAction } from './actions';

interface Goal {
  id: string;
  name: string;
  targetAmount: string;
  currency: 'USD' | 'DOP';
  targetDate: string | null;
  status: GoalStatus;
  currentAmount: string;
  progressPercent: string;
  remaining: string;
}

export default async function GoalsPage() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect('/login');
  }

  let goals: Goal[];
  try {
    goals = await backendFetch('/goals', {
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
          <h1 className="text-2xl font-semibold">Metas de ahorro</h1>
          <Link href="/dashboard" className="text-sm underline underline-offset-4">
            Volver al dashboard
          </Link>
        </div>

        <Button className="w-full" nativeButton={false} render={<Link href="/goals/new" />}>
          Nueva meta
        </Button>

        {goals.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            Todavía no tienes metas de ahorro.
          </p>
        )}

        {goals.map((goal) => (
          <Card key={goal.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{goal.name}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant={GOAL_STATUS_VARIANT[goal.status]}>
                    {GOAL_STATUS_LABEL[goal.status]}
                  </Badge>
                  <Link
                    href={`/goals/${goal.id}/edit`}
                    className="text-xs text-muted-foreground underline underline-offset-4"
                  >
                    Editar
                  </Link>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Progress value={Number(goal.progressPercent)} />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>
                    {formatMoney(goal.currentAmount, goal.currency)} de{' '}
                    {formatMoney(goal.targetAmount, goal.currency)}
                  </span>
                  <span>{Number(goal.progressPercent).toFixed(0)}%</span>
                </div>
                {goal.targetDate && (
                  <p className="text-xs text-muted-foreground">
                    Meta: {new Date(goal.targetDate).toLocaleDateString('es-DO', {
                      timeZone: 'UTC',
                    })}
                  </p>
                )}
              </div>

              {goal.status !== 'COMPLETED' && (
                <form
                  action={addContributionAction.bind(null, goal.id)}
                  className="flex items-end gap-2"
                >
                  <div className="flex-1 space-y-1">
                    <label htmlFor={`amount-${goal.id}`} className="text-xs text-muted-foreground">
                      Agregar aporte ({goal.currency})
                    </label>
                    <Input
                      id={`amount-${goal.id}`}
                      name="amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                    />
                    <input type="hidden" name="currency" value={goal.currency} />
                  </div>
                  <Button type="submit" size="sm">
                    Aportar
                  </Button>
                </form>
              )}

              {goal.status !== 'COMPLETED' && (
                <form
                  action={setGoalStatusAction.bind(
                    null,
                    goal.id,
                    goal.status === 'PAUSED' ? 'IN_PROGRESS' : 'PAUSED',
                  )}
                >
                  <Button type="submit" variant="outline" size="sm" className="w-full">
                    {goal.status === 'PAUSED' ? 'Reanudar' : 'Pausar'}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
