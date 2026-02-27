import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

export default async function Home() {
  const supabase = await createClient();

  if (!supabase) {
    redirect('/login');
  }

  let user = null;
  try {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    user = authUser;
  } catch {
    user = null;
  }

  if (user) {
    redirect('/booking/vehicle');
  }

  redirect('/login');
}
