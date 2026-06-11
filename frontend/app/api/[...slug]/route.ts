import { NextRequest, NextResponse } from 'next/server'

const BACKEND_PORT = process.env.BACKEND_PORT ?? '5000'
const BACKEND_BASE = `http://localhost:${BACKEND_PORT}`

async function proxy(req: NextRequest, slug: string[]): Promise<NextResponse> {
  const path = slug.join('/')
  const { search } = new URL(req.url)
  const targetUrl = `${BACKEND_BASE}/api/${path}${search}`

  const headers = new Headers(req.headers)
  headers.delete('host')

  const body = req.method !== 'GET' && req.method !== 'HEAD'
    ? await req.arrayBuffer()
    : undefined

  try {
    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      signal: AbortSignal.timeout(120_000),
    })
    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: upstream.headers,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'proxy error'
    return NextResponse.json({ success: false, error: message }, { status: 502 })
  }
}

export async function GET(req: NextRequest, { params }: { params: { slug: string[] } }) {
  return proxy(req, params.slug)
}
export async function POST(req: NextRequest, { params }: { params: { slug: string[] } }) {
  return proxy(req, params.slug)
}
export async function PUT(req: NextRequest, { params }: { params: { slug: string[] } }) {
  return proxy(req, params.slug)
}
export async function DELETE(req: NextRequest, { params }: { params: { slug: string[] } }) {
  return proxy(req, params.slug)
}
