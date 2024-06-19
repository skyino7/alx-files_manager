import redisClient from '../utils/redis';

describe('Redis Client', () => {
  beforeAll(() => {
    redisClient.set('test_key', 'test_value');
  });

  afterAll(() => {
    redisClient.del('test_key');
  });

  it('should get a value from Redis', async () => {
    const value = await redisClient.get('test_key');
    expect(value).toBe('test_value');
  });

  it('should set a value in Redis', async () => {
    await redisClient.set('test_key_2', 'test_value_2');
    const value = await redisClient.get('test_key_2');
    expect(value).toBe('test_value_2');
  });

  it('should delete a key from Redis', async () => {
    await redisClient.del('test_key_2');
    const value = await redisClient.get('test_key_2');
    expect(value).toBeNull();
  });
});
