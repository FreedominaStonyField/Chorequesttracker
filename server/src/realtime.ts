import type { Server } from 'node:http'
import { Server as SocketIOServer } from 'socket.io'
import type { RepositoryEvent } from 'shared/types'
import { repositoryEvents } from './repository'

export function createRealtimeGateway(httpServer: Server) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
    },
  })

  const forwardEvent = (event: RepositoryEvent) => {
    io.emit('repository:event', event)
  }

  repositoryEvents.on('event', forwardEvent)

  io.on('connection', (socket) => {
    socket.emit('repository:event', { type: 'connection.ack', payload: { connectedAt: new Date().toISOString() } })
  })

  httpServer.on('close', () => {
    repositoryEvents.off('event', forwardEvent)
  })

  return io
}
