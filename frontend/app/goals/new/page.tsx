import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GoalForm } from '@/components/goal-form';
import { getAccessToken } from '@/lib/session';

export default async function NewGoalPage() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect('/login');
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Nueva meta de ahorro</CardTitle>
          <CardDescription>Define un objetivo y ve tu progreso</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <GoalForm />
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
