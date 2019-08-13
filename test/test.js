/* eslint-env node, mocha */
const assert = require('assert');
const rlayClient = require('./generated/rlay-client');
const { RlaySchemaRegistry } = require('../src');
const Redis = require('ioredis-mock');

const redis = new Redis({
  port: 6379,
  host: '127.0.0.1',
  password: process.env.REDIS_PASSWORD,
  db: process.env.REDIS_DB || 0
});

const doesNotThrowAsync = async (fn, regExp, errorMessage) => {
  let f = () => { };
  try { await fn(); } catch(e) { f = () => {throw e}; } finally {
    assert.doesNotThrow(f, regExp, errorMessage);
  }
}

const initSchemaCids = { testKey: '0x01', anotherKey: '0x02' };
const assertion = { type: 'Annotation' }
const initSchemaPayloads = [{ key: 'anotherKey', assertion }, { key: 'testKey', assertion }];
const registryConfig = { db: redis, namespace: 'test:' }
const rlaySchemaRegistry = new RlaySchemaRegistry(registryConfig);

const clearRedis = async () => Promise.all((await redis.keys('*')).map(key => redis.del(key)))

describe('RlaySchemaRegistry', () => {
  before(clearRedis);

  describe('new', () => {
    it('works as expected', () => {
      assert.equal(rlaySchemaRegistry instanceof RlaySchemaRegistry, true);
      assert.equal(rlaySchemaRegistry.db instanceof Redis, true);
    });
  });

  describe('.writeSchemaFromClient', () => {
    before(clearRedis);
    after(clearRedis);

    it('stores it correctly', async () => {
      await rlaySchemaRegistry.writeSchemaFromClient(rlayClient);
      const redisCidKeys = await redis.keys('*:cid:*');
      const redisPayloadKeys = await redis.keys('*:payload:*');
      assert.equal(redisCidKeys.length, 120);
      assert.equal(redisPayloadKeys.length, 39);
    });
  });

  describe('.writeSchemaCids', () => {
    it('stores it correctly', async () => {
      await rlaySchemaRegistry.writeSchemaCids(initSchemaCids);
      const allRedisKeys = await redis.keys('*:cid:*');
      assert.deepEqual(allRedisKeys.sort(), [
        'rlaySchemaRegistry:test:cid:anotherKey',
        'rlaySchemaRegistry:test:cid:testKey'
      ]);
      assert.deepEqual((await Promise.all(
        allRedisKeys.map(key => redis.get(key)))).sort(), ['0x01', '0x02']);
    });
  });

  describe('.readSchemaCids', () => {
    it('reads it correctly', async () => {
      const schemaCids = await rlaySchemaRegistry.readSchemaCids();
      assert.deepEqual(schemaCids, initSchemaCids);
    });
  });

  describe('.writeSchemaPayloads', () => {
    it('stores it correctly', async () => {
      await rlaySchemaRegistry.writeSchemaPayloads(initSchemaPayloads);
      const allRedisKeys = await redis.keys('*:payload:*');
      assert.deepEqual(allRedisKeys.sort(), [
        'rlaySchemaRegistry:test:payload:anotherKey',
        'rlaySchemaRegistry:test:payload:testKey'
      ]);
      assert.deepEqual((await Promise.all(
        allRedisKeys.map(key => redis.get(key)))).map(JSON.parse).sort(), [assertion, assertion]);
    });
  });

  describe('.readSchemaPayloads', () => {
    it('reads it correctly', async () => {
      const schemaPayloads = await rlaySchemaRegistry.readSchemaPayloads();
      assert.deepEqual(schemaPayloads, initSchemaPayloads);
    });
  });
});
