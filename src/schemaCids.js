const check = require('check-types');

class SchemaCids {
  constructor (registry, schemaCids) {
    check.assert.object(schemaCids);
    this.data = schemaCids;
    this._registry = registry;
  }

  static fromRedis(registry, redisResults) {
    return new SchemaCids(registry,
      redisResults.
      reduce((schemaCids, result) => {
        schemaCids[registry.SchemaKey.fromRedisKey(SchemaCids.typeKey, result[0])] = result[1];
        return schemaCids
      }, {})
    );
  }

  toCommands () {
    const keys = Object.keys(this.data);
    return keys.map(key => [
      'set',
      this._registry.RedisKey.fromSchemaKey(SchemaCids.typeKey, key),
      this.data[key]
    ]);
  }
}

SchemaCids.typeKey = 'cid:';

module.exports = { SchemaCids };
