import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { backendFetch, BackendError } from '@/lib/backend';
import { getAccessToken } from '@/lib/session';
import { logoutAction } from './actions';

interface Membership {
  householdId: string;
  householdName: string;
  role: string;
}

interface Profile {
  id: string;
  email: string;
  name: string;
  memberships: Membership[];
}

export default async function DashboardPage() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect('/login');
  }

  let profile: Profile;
  try {
    profile = await backendFetch('/auth/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch (error) {
    if (error instanceof BackendError && error.status === 401) {
      redirect('/login');
    }
    throw error;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Hola, {profile.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{profile.email}</p>

          {profile.memberships?.map((membership) => (
            <div key={membership.householdId} className="rounded-md border p-3 text-sm">
              <p className="font-medium">{membership.householdName}</p>
              <p className="text-muted-foreground">Rol: {membership.role}</p>
            </div>
          ))}

          <form action={logoutAction}>
            <Button type="submit" variant="outline" className="w-full">
              Cerrar sesión
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
