// uuid/v4 is what pouchdb/utils uses
var uuid = require('uuid').v4
var Checkpointer = require('pouchdb-checkpointer')
var generateReplicationId = require('pouchdb-generate-replication-id')

module.exports = {
  maybeAllDocsReplicate: maybeAllDocsReplicate
}

function maybeAllDocsReplicate (localDb) {
  var remoteDb = this
  return generateReplicationId(remoteDb, localDb, {})
    .then(downloadRepId => {
      // Only try one shot if we've never seen this replication id.
      return localDb.get(downloadRepId).catch(resp => {
        return downloadReplication(remoteDb, localDb, downloadRepId)
          .then(() => uploadReplication(remoteDb, localDb))
      })
    })
}

function downloadReplication (remoteDb, localDb, downloadRepId) {
  return remoteDb.allDocs({ include_docs: true, update_seq: true })
    .then(({update_seq, rows}) => {
      var docs = rows.map(row => row.doc)
      return localDb.bulkDocs({ docs, new_edits: false })
        .then(() => writeCheckpoint(remoteDb, localDb, downloadRepId, update_seq))
    })
}

function uploadReplication(remoteDb, localDb) {
  return generateReplicationId(localDb, remoteDb, {})
    .then(uploadRepId => {
      return remoteDb.get(uploadRepId).catch(() => {
        return localDb.info().then(({update_seq}) => {
          return writeCheckpoint(localDb, remoteDb, uploadRepId, update_seq)
        })
      })
    })
}

function writeCheckpoint (firstDb, secondDb, replicationId, seq_no) {
  var options = { writeSourceCheckpoint: true, writeTargetCheckpoint: true }
  var checkpointer = new Checkpointer(firstDb, secondDb, replicationId, {}, options)
  var session = uuid()
  return checkpointer.writeCheckpoint(seq_no, session)
}
