import { type NextRequest } from 'next/server'
import { runMiddlewarePipeline } from '@/lib/middleware/pipeline'

export async function middleware(request: NextRequest) {
  return runMiddlewarePipeline(request)
}

export const config = {
  matcher: [
    // Statik dosyalar ve _next hariç her şeyi eşleştir
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
