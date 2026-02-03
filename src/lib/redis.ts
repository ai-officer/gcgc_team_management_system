import { createClient, RedisClientType } from 'redis'

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

let redisClient: RedisClientType | null = null
let isConnecting = false

/**
 * Get a shared Redis client for publishing events
 */
export async function getRedisClient(): Promise<RedisClientType | null> {
  if (redisClient?.isOpen) {
    return redisClient
  }

  if (isConnecting) {
    // Wait for existing connection attempt
    await new Promise(resolve => setTimeout(resolve, 100))
    return redisClient
  }

  try {
    isConnecting = true
    redisClient = createClient({ url: redisUrl })

    redisClient.on('error', (err) => {
      console.error('Redis client error:', err)
    })

    await redisClient.connect()
    console.log('Redis client connected for notifications')
    isConnecting = false
    return redisClient
  } catch (error) {
    console.warn('Redis not available for notifications:', error)
    isConnecting = false
    redisClient = null
    return null
  }
}

/**
 * Publish a notification event to Redis for Socket.IO to emit
 */
export async function publishNotification(userId: string, notification: object) {
  try {
    const client = await getRedisClient()
    if (client) {
      await client.publish('notifications', JSON.stringify({
        userId,
        notification,
        timestamp: new Date().toISOString(),
      }))
      console.log(`Published notification to Redis for user-${userId}`)
      return true
    }
    return false
  } catch (error) {
    console.error('Error publishing notification to Redis:', error)
    return false
  }
}
