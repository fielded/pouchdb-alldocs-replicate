# PouchDB allDocs replicate
PouchDB plug-in for one shot replication from remote using allDocs and PouchDB checkpoints.

Idea is to skip the request-heavy CouchDB replication protocol used by Pouch for initial replication
and make an all-or-nothing HTTP request to `dbname/_all_docs`. Once completed, save the docs locally
and correctly setup replication IDs + checkpoints in PouchDB so that pouch's sync can safely take over.

### Usage:

```
var PouchDB = require('pouchdb')
var allDocsReplicate = require('pouchdb-all-docs-replicate')

PouchDB.plugin(allDocsReplicate)

var localDb = new PouchDB('sync-test')
var remoteDb = new PouchDB('http://localhost:5984/sync-test') // disk size 5000

remoteDb.maybeAllDocsReplicate(localDb, onProgressUpdates).then(() => {
  console.log('initial download complete')
})

function onProgressUpdates (downloadedBytes, diskSizeBytes) {
  console.log(downloadedBytes, diskSizeBytes)
}


logs:

0, 5000
100, 5000
...
5000, 5000
initial download complete


```

see /example for usage.


### Caveats:
 - Doesn't handle attachments
 - Doesn't work if you attempt concurrent replication on the same DBs with a different pouch.
