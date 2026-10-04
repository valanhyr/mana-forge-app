import * as msw from 'msw'

// Basic example handlers; extend these per-test with server.use(...)
export const handlers = [
  // Example: mock cards API
  msw.rest.get('http://localhost:8080/api/cards', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json([{ id: 'card-1', name: 'Black Lotus' }]))
  })
]
