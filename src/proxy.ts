import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (
    !supabaseUrl ||
    !supabaseKey ||
    supabaseUrl.includes('placeholder') ||
    supabaseKey === 'placeholder-key'
  ) {
    const { pathname } = request.nextUrl;
    const publicRoutes = ['/login', '/register', '/'];
    if (!publicRoutes.includes(pathname)) {
      const url = new URL('/login', request.url);
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value }) => supabaseResponse.cookies.set(name, value));
      },
    },
  });

  let user = null;
  try {
    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser();
    user = supabaseUser;
  } catch {
    user = null;
  }

  const { pathname } = request.nextUrl;
  const redirectParam = request.nextUrl.searchParams.get('redirect');
  const safeRedirect =
    redirectParam &&
    redirectParam.length <= 200 &&
    redirectParam.startsWith('/') &&
    !redirectParam.startsWith('//') &&
    !redirectParam.includes('\\') &&
    !redirectParam.includes('\n') &&
    !redirectParam.includes('\r')
      ? redirectParam
      : '/';

  const publicRoutes = ['/login', '/register', '/'];
  const isPublicRoute = publicRoutes.includes(pathname);

  if (!user && !isPublicRoute) {
    const url = new URL('/login', request.url);
    url.searchParams.set('redirect', safeRedirect);
    return NextResponse.redirect(url);
  }

  if (user && ['/login', '/register'].includes(pathname)) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js)$).*)',
  ],
};
