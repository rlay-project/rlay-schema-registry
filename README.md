# rlay-schema-registry

Client for registering any rlay schema via redis remotely to improve portability of rlay applications.

## Usage

Examples focus on usage with `rlay-client-lib` which is the most common setup.

### Write to registry

```js
const rlayClient = require('./generated/rlay-client');
const Redis = require('ioredis');
const { RlaySchemaRegistry } = require('@rlay/schema-registry');

// connect to redis which serves as registry for our rlay schema
const redis = new Redis();
const rlaySchemaRegistry = new RlaySchemaRegistry({
  db: redis,
  namespace: 'my-app' // selecting the right registry
});

const main = async () => {
  // writing the schema to the redis registry
  await rlaySchemaRegistry.writeSchemaFromClient(rlayClient);
  // writeSchemaFromClient uses the lowe-level
  // .writeSchemaCids and .writeSchemaPayloads under the hood.
});

main();
```

### Read and update client

```js
const { Client } = require('@rlay/rlay-client-lib');
const Redis = require('ioredis');
const { RlaySchemaRegistry } = require('@rlay/schema-registry');

// connect to redis where registered rlay schema is stored
const redis = new Redis();
const rlaySchemaRegistry = new RlaySchemaRegistry({
  db: redis,
  namespace: 'my-app' // selecting the right registry
});

const emptyRlayClient = new Client();

const main = async () => {
  // fetching the schema cids and payloads from the registry
  // and passing it to the empty rlay client
  emptyRlayClient.initSchema(
    await rlaySchemaRegistry.readSchemaCids(),
    await rlaySchemaRegistry.readSchemaPayloads()
  );
  // letting rlay client do its think
  rlayClient.initClient();
  // emptyRlayClient is now indistinguishable from the auto generated rlayClient
  // from the example before.
  // assert.deepEqual(emptyRlayClient, rlayClient); -> would return true
});

main();
```
