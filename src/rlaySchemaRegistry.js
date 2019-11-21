const check = require('check-types');
const { SchemaCids } = require('./schemaCids');
const { SchemaPayloads } = require('./schemaPayloads');

const RSR_NAMESPACE = 'rlaySchemaRegistry:';

class RlaySchemaRegistry {
  constructor ({db, namespace}) {
    check.assert.string(namespace, 'expected namespace to be a string');
    this.db = db;
    this.namespace = namespace;
    this.dbNamespace = RSR_NAMESPACE + this.namespace;
    this.RedisKey = {
      fromSchemaKey: (typeKey, key) => {
        return this.dbNamespace + typeKey + key
      }
    }
    this.SchemaKey = {
      fromRedisKey: (typeKey, key) => {
        return key.slice((this.dbNamespace + typeKey).length);
      }
    }
  }

  /**
   * Return [key, value] of redis cid and payload keys and their values
   *
   * @param {String} typeKey - either `cid` or `payload`
   * @return {Array} - [key, value] (note: redis.multi returns [null,value])
   */
  async _findKeyValues (typeKey) {
    const keys = await this.db.keys(`${this.dbNamespace}${typeKey}*`);
    const results = await this.db.multi(keys.map(key => ['get', key])).exec();
    return results.map((val, i) => [keys[i], val[1]]);
  }

  async writeSchemaToClient (rlayClient) {
    const [cids, payloads] = await Promise.all([
      this.readSchemaCids(),
      this.readSchemaPayloads()
    ]);
    rlayClient.initSchema(
      cids,
      payloads
    );
    rlayClient.initClient();
  }

  async writeSchemaFromClient (rlayClient) {
    const schema = rlayClient.schema;
    const schemaKeys = Object.keys(schema);
    // get schema CIDs from client
    const schemaCids = schemaKeys.reduce((schemaCids, key) => {
      return {...schemaCids, [key]: schema[key].cid}
    }, {});

    // get schema payload from client
    const schemaPayloads = schemaKeys.reduce((schemaPayloads, key) => {
      if (schema[key].payload) {
        schemaPayloads.push({ key, assertion: schema[key].payload.toJson() });
      }
      return schemaPayloads;
    }, []);
    return Promise.all([
      this.writeSchemaCids(schemaCids),
      this.writeSchemaPayloads(schemaPayloads)
    ]);
  }

  async writeSchemaCids (schemaCids) {
    const schemaCidsClass = new SchemaCids(this, schemaCids);
    return this.db.multi(schemaCidsClass.toCommands()).exec();
  }

  async readSchemaCids () {
    const result = await this._findKeyValues(SchemaCids.typeKey);
    const schemaCidsClass = SchemaCids.fromRedis(this, result);
    return schemaCidsClass.data;
  }

  async writeSchemaPayloads (schemaPayloads) {
    const schemaPayloadsClass = new SchemaPayloads(this, schemaPayloads);
    return this.db.multi(schemaPayloadsClass.toCommands()).exec();
  }

  async readSchemaPayloads () {
    const result = await this._findKeyValues(SchemaPayloads.typeKey);
    const schemaPayloadsClass = SchemaPayloads.fromRedis(this, result);
    return schemaPayloadsClass.data;
  }
}

module.exports = { RlaySchemaRegistry }
