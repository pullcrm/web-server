// This is a simple Node server that uses the built project.

require('dotenv').config()

global.fetch = require('node-fetch')
const path = require('path')
const express = require('express')

const dist = '../app/dist'

// This contains a list of static routes (assets)
const { ssr } = require(`${dist}/server/package.json`)

// The manifest is required for preloading assets
const manifest = require(`${dist}/client/ssr-manifest.json`)

// This is the server renderer we just built
const { default: renderPage } = require(`${dist}/server`)

const server = express()

server.disable('x-powered-by')

const MAX_AGE_ASSETS = 30 * 24 * 60 * 60 * 1000 // 30 days
const MAX_AGE_DEFAULT = 1 * 60 * 60 * 1000 // 1 hour

// Serve every static asset route
for (const asset of ssr.assets || []) {
  const maxAge = asset === 'assets'
    ? MAX_AGE_ASSETS
    : MAX_AGE_DEFAULT

  server.use(
    '/' + asset,
    express.static(path.join(__dirname, `${dist}/client/` + asset), { maxAge, redirect: false })
  )
}

// Everything else is treated as a "rendering request"
server.get('*', async (request, response) => {
  const url =
    request.protocol + '://' + request.get('host') + request.originalUrl

  const { html, status, statusText, headers } = await renderPage(url, {
    manifest,
    preload: true,
    // Anything passed here will be available in the main hook
    request,
    response,
    // initialState: { ... } // <- This would also be available
  })

  response.type('html')
  response.writeHead(status || 200, statusText || headers, headers)
  response.end(html)
})

console.log(process.env.PORT)

server.listen(process.env.PORT || 8080)
