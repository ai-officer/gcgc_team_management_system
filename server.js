const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require('socket.io')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = parseInt(process.env.PORT || '3000', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })

  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXTAUTH_URL || `http://localhost:${port}`,
      methods: ['GET', 'POST']
    }
  })

  // Store socket.io instance globally for webhook access
  global.io = io

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id)

    // Join user-specific room
    socket.on('join-calendar-sync', async (userId) => {
      if (!userId) return

      socket.join(`user-${userId}`)
      console.log(`User ${userId} joined calendar sync`)

      // Emit connected status
      io.to(`user-${userId}`).emit('sync-status', {
        isConnected: true,
        timestamp: new Date().toISOString()
      })
    })

    socket.on('leave-calendar-sync', (userId) => {
      if (!userId) return

      socket.leave(`user-${userId}`)
      console.log(`User ${userId} left calendar sync`)
    })

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id)
    })

    socket.on('manual-sync', async (data) => {
      const { userId } = data
      if (!userId) return

      try {
        // Trigger immediate sync
        io.to(`user-${userId}`).emit('sync-started')

        const response = await fetch(`${process.env.NEXTAUTH_URL || `http://localhost:${port}`}/api/calendar/sync-from-google`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId })
        })

        if (response.ok) {
          const result = await response.json()
          io.to(`user-${userId}`).emit('sync-completed', result)
        } else {
          io.to(`user-${userId}`).emit('sync-error', { error: 'Sync failed' })
        }
      } catch (error) {
        console.error('Manual sync error:', error)
        io.to(`user-${userId}`).emit('sync-error', { error: error.message })
      }
    })
  })

  // Cleanup on server shutdown
  process.on('SIGTERM', () => {
    httpServer.close()
  })

  httpServer
    .once('error', (err) => {
      console.error(err)
      process.exit(1)
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`)
      console.log(`> WebSocket server running`)
    })
})
