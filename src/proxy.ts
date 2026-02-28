import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const ALLOWED_REDIRECTS = new Set([
  '/',
  '/admin',
  '/booking/vehicle',
  '/booking/services',
  '/booking/schedule',
  '/booking/customer',
  '/booking/payment',
]);

const isSafeRedirect = (value: string | null): value is string =>
  !!value &&
  value.length <= 200 &&
  value.startsWith('/') &&
  !value.startsWith('//') &&
  !value.includes('\\') &&
  !value.includes('\n') &&
  !value.includes('\r') &&
  ALLOWED_REDIRECTS.has(value);

const applySecurityHeaders = (response: NextResponse) => {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
  );
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  // Use a production-focused CSP; keep dev runtime unblocked.
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "font-src 'self' data:",
        "connect-src 'self' https:",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "object-src 'none'",
        'upgrade-insecure-requests',
      ].join('; ')
    );
  }

  return response;
};

export async function proxy(request: NextRequest) {
  let supabaseResponse = applySecurityHeaders(NextResponse.next({ request }));

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
      return applySecurityHeaders(NextResponse.redirect(url));
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
        supabaseResponse = applySecurityHeaders(NextResponse.next({ request }));
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
  } catch (error) {
    console.warn('proxy auth lookup failed', {
      message: error instanceof Error ? error.message : 'unknown',
    });
    user = null;
  }

  const { pathname } = request.nextUrl;
  const redirectParam = request.nextUrl.searchParams.get('redirect');
  const fallbackRoute = ALLOWED_REDIRECTS.has(pathname) ? pathname : '/';
  const safeRedirect: string = isSafeRedirect(redirectParam) ? redirectParam : fallbackRoute;

  const publicRoutes = ['/login', '/register', '/'];
  const isPublicRoute = publicRoutes.includes(pathname);

  if (!user && !isPublicRoute) {
    const url = new URL('/login', request.url);
    url.searchParams.set('redirect', safeRedirect);
    return applySecurityHeaders(NextResponse.redirect(url));
  }

  if (user && ['/login', '/register'].includes(pathname)) {
    return applySecurityHeaders(NextResponse.redirect(new URL('/', request.url)));
  }

  if (user && !isPublicRoute) {
    supabaseResponse.headers.set('Cache-Control', 'private, no-store, max-age=0');
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js)$).*)',
  ],
};
