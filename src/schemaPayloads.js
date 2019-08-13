const check = require('check-types');

class SchemaPayloads {
  constructor (registry, schemaPayloads) {
    check.assert.array(schemaPayloads, 'expected schemaPayloads to be an array');
    check.assert.equal(
      check.all(schemaPayloads.map(schemaPayload => {
        return check.map(schemaPayload, { key: check.string, assertion: check.object });
      })),
      true
    );
    this.data = schemaPayloads;
    this._registry = registry;
  }

  static fromRedis(registry, redisResults) {
    return new SchemaPayloads(registry,
      redisResults.
      reduce((schemaPayloads, result) => {
        schemaPayloads.push({
          key: registry.SchemaKey.fromRedisKey(SchemaPayloads.typeKey, result[0]),
          assertion: JSON.parse(result[1])
        });
        return schemaPayloads
      }, [])
    );
  }

  toCommands () {
    return this.data.map(schemaPayload => [
      'set',
      this._registry.RedisKey.fromSchemaKey(SchemaPayloads.typeKey, schemaPayload.key),
      JSON.stringify(schemaPayload.assertion)
    ]);
  }
}

SchemaPayloads.typeKey = 'payload:';

module.exports = { SchemaPayloads };
