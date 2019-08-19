# rlay-schema-registry

Client for registering any rlay schema via redis remotely to improve portability of rlay applications.

## Usage

Examples focus on usage with `rlay-client-lib` which is the most common setup.

We assume

```js
const rlayClient = require('./generated/rlay-client');
const { Client } = require('@rlay/rlay-client-lib');
const Redis = require('ioredis');
const { RlaySchemaRegistry } = require('@rlay/schema-registry');

const rlaySchemaRegistry = new RlaySchemaRegistry({
  db: new Redis(), // connect to redis where registered rlay schema is stored
  namespace: 'my-app' // selecting the right registry
});
```

### Write to registry

```js
(async () => {
  // writing the schema to the redis registry
  await rlaySchemaRegistry.writeSchemaFromClient(rlayClient);
  // writeSchemaFromClient uses the low-level methods
  // .writeSchemaCids and .writeSchemaPayloads under the hood.
})();
```

### Read and update client

```js
const emptyRlayClient = new Client();

(async () => {
  // fetching the schema cids and payloads from the registry
  // and passing it to the empty rlay client
  await rlaySchemaRegistry.writeSchemaFromClient(emptyRlayClient);
  // emptyRlayClient is now indistinguishable from the auto generated rlayClient
  // from the example before.
  // assert.deepEqual(emptyRlayClient, rlayClient); -> would return true
  // writeSchemaFromClient uses the low-level methods
  // .readSchemaCids and .readSchemaPayloads under the hood.
})();
```
