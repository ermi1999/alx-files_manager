const redis = require('redis');
const { promisify } = require('util');

class RedisClient {
  constructor() {
    this.client = redis.createClient();

    this.client.on('error', (err) => {
      console.log('Redis Client Error', err);
    });
  }

  isAlive() {
    return this.client.connected;
  }

  async get(key) {
    const getAsync = promisify(this.client.get).bind(this.client);
    return getAsync(key);
  }

  async set(key, value, duration) {
    await this.client.setex(key, duration, value);
  }

  async del(key) {
    await this.client.del(key);
  }
}

const redisClient = new RedisClient();

module.exports = redisClient;
