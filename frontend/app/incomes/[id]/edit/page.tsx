import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { IncomeForm } from '@/components/income-form';
import { backendFetch, BackendError } from '@/lib/backend';
import { getAccessToken } from '@/lib/session';

interface Income {
  id: string;
  type: 'SALARY' | 'FREELANCE' | 'OTHER';
  currency: 'USD' | 'DOP';
  amount: string;
  period: string;
  receivedAt: string;
  description: string | null;
}

export default async function EditIncomePage({ params }: { params: Promise<{ id: string }> }) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect('/login');
  }

  const { id } = await params;

  let income: Income;
  try {
    income = await backendFetch(`/incomes/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch (error) {
    if (error instanceof BackendError && error.status === 401) {
      redirect('/login');
    }
    if (error instanceof BackendError && error.status === 404) {
      redirect('/incomes');
    }
    throw error;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Editar ingreso</CardTitle>
          <CardDescription>Corrige los datos de este ingreso</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <IncomeForm income={income} />
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
