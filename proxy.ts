import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const SECRET_TOKEN = process.env.ACCESS_TOKEN!
const isProd = process.env.NODE_ENV === 'production'

export function proxy(request: NextRequest) {
  console.log('PROXY HIT', request.nextUrl.pathname, 'cookie:', request.cookies.get('access_token')?.value)
  const { pathname, searchParams } = request.nextUrl
  const cookieToken = request.cookies.get('access_token')?.value
  const urlToken = searchParams.get('token')

  if (urlToken === SECRET_TOKEN) {
    const res = NextResponse.redirect(new URL(pathname, request.url))
    res.cookies.set('access_token', SECRET_TOKEN, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
      ...(process.env.COOKIE_DOMAIN && { domain: process.env.COOKIE_DOMAIN }),
      maxAge: 10000 * 60,
    })
    return res
  }

  if (cookieToken === SECRET_TOKEN) return NextResponse.next()

  return NextResponse.rewrite(new URL('/denied', request.url))
}

export const config = {
  matcher: ['/((?!_next|favicon.ico).*)'],
}
