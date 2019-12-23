const check = require('check-types');
const { SchemaCids } = require('./schemaCids');
const { SchemaPayloads } = require('./schemaPayloads');
const debug = require('./debug');

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
  async _findKeyValues (typeKey, _debug) {
    let debug = _debug || debug;
    const startKeys = Date.now();
    const keys = await this.db.keys(`${this.dbNamespace}${typeKey}*`);
    debug.extend('findKeyValues:redis:keys')(keys.length);
    debug.extend('findKeyValues:redis:keys:duration')(`${Date.now() - startKeys}ms`);

    const startKeysGet = Date.now();
    const results = await this.db.multi(keys.map(key => ['get', key])).exec();
    debug.extend('findKeyValues:redis:multi:get:duration')(`${Date.now() - startKeysGet}ms`);

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
      schemaCids[key] = schema[key].cid;
      return schemaCids;
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
    const thisDebug = debug.extend('writeSchemaCids');
    const schemaCidsClass = new SchemaCids(this, schemaCids);

    const startCommandArgs = Date.now();
    const commandArgs = schemaCidsClass.toCommands();
    thisDebug.extend('toCommands:duration')(`${Date.now() - startCommandArgs}ms`);

    const startMultiSet = Date.now();
    const result = this.db.multi(commandArgs).exec();
    thisDebug.extend('redis:multi:set:duration')(`${Date.now() - startMultiSet}ms`);

    return result;
  }

  async readSchemaCids () {
    const thisDebug = debug.extend('readSchemaCids');
    const result = await this._findKeyValues(SchemaCids.typeKey, thisDebug);

    const startFromRedis = Date.now();
    const schemaCidsClass = SchemaCids.fromRedis(this, result);
    thisDebug.extend('fromRedis:duration')(`${Date.now() - startFromRedis}ms`);

    return schemaCidsClass.data;
  }

  async writeSchemaPayloads (schemaPayloads) {
    const thisDebug = debug.extend('writeSchemaPayloads');
    const schemaPayloadsClass = new SchemaPayloads(this, schemaPayloads);

    const startCommandArgs = Date.now();
    const commandArgs = schemaPayloadsClass.toCommands();
    thisDebug.extend('toCommands:duration')(`${Date.now() - startCommandArgs}ms`);

    const startMultiSet = Date.now();
    const result = this.db.multi(commandArgs).exec();
    thisDebug.extend('redis:multi:set:duration')(`${Date.now() - startMultiSet}ms`);

    return result;
  }

  async readSchemaPayloads () {
    const thisDebug = debug.extend('readSchemaPayloads');
    const result = await this._findKeyValues(SchemaPayloads.typeKey, thisDebug);

    const startFromRedis = Date.now();
    const schemaPayloadsClass = SchemaPayloads.fromRedis(this, result);
    thisDebug.extend('fromRedis:duration')(`${Date.now() - startFromRedis}ms`);
    return schemaPayloadsClass.data;
  }
}

module.exports = { RlaySchemaRegistry }
