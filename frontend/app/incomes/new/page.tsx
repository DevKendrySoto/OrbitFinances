import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { IncomeForm } from '@/components/income-form';
import { getAccessToken } from '@/lib/session';

export default async function NewIncomePage() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect('/login');
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Nuevo ingreso</CardTitle>
          <CardDescription>Registra un salario, freelance u otro ingreso</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <IncomeForm />
          <Link
            href="/incomes"
            className="block text-center text-sm text-muted-foreground underline underline-offset-4"
          >
            Volver a ingresos
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
