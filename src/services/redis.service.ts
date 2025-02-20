import { createClient } from 'redis';

class RedisService {
    private client;
    private isConnected = false;

    constructor() {
        this.client = createClient({
            url: process.env.REDIS_URL || 'redis://localhost:6379'
        });

        this.client.on('error', (err: any) => {
            this.isConnected = false;
            console.error('Redis Client Error:', err);
        });

        this.client.on('connect', () => {
            this.isConnected = true;
            console.log('Redis Client Connected');
        });

        this.client.on('disconnect', () => {
            this.isConnected = false;
            console.log('Redis Client Disconnected');
        });

        this.client.connect().catch(error => {
            console.error('Redis Connection Error:', error);
            this.isConnected = false;
        });
    }

    async get(key: string): Promise<string | null> {
        try {
            if (!this.isConnected) {
                console.log('Redis not connected, skipping cache get');
                return null;
            }
            return await this.client.get(key);
        } catch (error) {
            console.error('Redis get error:', error);
            return null;
        }
    }

    async set(key: string, value: string, ttlSeconds: number): Promise<void> {
        try {
            if (!this.isConnected) {
                console.log('Redis not connected, skipping cache set');
                return;
            }
            await this.client.set(key, value, { EX: ttlSeconds });
            console.log(`Cached value for key: ${key} with TTL: ${ttlSeconds}s`);
        } catch (error) {
            console.error('Redis set error:', error);
        }
    }
}

export const redisService = new RedisService(); 