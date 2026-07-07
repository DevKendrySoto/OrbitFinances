import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ExpenseForm } from '@/components/expense-form';
import { getAccessToken } from '@/lib/session';

export default async function NewExpensePage() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect('/login');
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Nuevo gasto</CardTitle>
          <CardDescription>Registra un gasto variable del hogar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ExpenseForm />
          <Link
            href="/expenses"
            className="block text-center text-sm text-muted-foreground underline underline-offset-4"
          >
            Volver a gastos
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
