import { redirect } from 'next/navigation';
import { getAccessToken } from '@/lib/session';

export default async function Home() {
  const accessToken = await getAccessToken();
  redirect(accessToken ? '/dashboard' : '/login');
}
