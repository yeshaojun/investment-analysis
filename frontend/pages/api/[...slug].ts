import type { NextApiRequest, NextApiResponse } from 'next'
import http from 'http'

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
    externalResolver: true,
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const backendPort = process.env.BACKEND_PORT || '5000'
  const path = req.url?.replace('/api/', '') || ''
  const targetUrl = `http://localhost:${backendPort}/api/${path}`
  
  const url = new URL(targetUrl)
  
  const options = {
    hostname: url.hostname,
    port: url.port,
    path: url.pathname + url.search,
    method: req.method,
    headers: {
      ...req.headers,
      host: url.host,
      'content-length': req.headers['content-length'] || '0',
    },
    timeout: 120000,
  }

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 500, proxyRes.headers)
    proxyRes.pipe(res)
  })

  proxyReq.on('error', (error) => {
    console.error('Proxy error:', error)
    res.status(500).json({ error: 'Proxy error', message: error.message })
  })

  proxyReq.on('timeout', () => {
    console.error('Proxy timeout')
    proxyReq.destroy()
    res.status(504).json({ error: 'Gateway timeout' })
  })

  req.pipe(proxyReq)
}
