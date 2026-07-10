import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GoalForm } from '@/components/goal-form';
import { backendFetch, BackendError } from '@/lib/backend';
import { getAccessToken } from '@/lib/session';

interface Goal {
  id: string;
  name: string;
  targetAmount: string;
  currency: 'USD' | 'DOP';
  targetDate: string | null;
}

export default async function EditGoalPage({ params }: { params: Promise<{ id: string }> }) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect('/login');
  }

  const { id } = await params;

  let goal: Goal;
  try {
    goal = await backendFetch(`/goals/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch (error) {
    if (error instanceof BackendError && error.status === 401) {
      redirect('/login');
    }
    if (error instanceof BackendError && error.status === 404) {
      redirect('/goals');
    }
    throw error;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Editar meta</CardTitle>
          <CardDescription>Ajusta el nombre, el monto objetivo o la fecha</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <GoalForm goal={goal} />
          <Link
            href="/goals"
            className="block text-center text-sm text-muted-foreground underline underline-offset-4"
          >
            Volver a metas
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
