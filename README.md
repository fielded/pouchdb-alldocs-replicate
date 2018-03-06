# PouchDB allDocs replicate
PouchDB plug-in for one shot replication from remote using allDocs and PouchDB checkpoints.

### Caveats:
 - Doesn't handle attachments
 - Doesn't work if you attempt concurrent replication on the same DBs with a different pouch.
