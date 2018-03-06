// uuid/v4 is what pouchdb/utils uses
var uuid = require('uuid').v4
var Checkpointer = require('pouchdb-checkpointer')
var generateReplicationId = require('pouchdb-generate-replication-id')

module.exports = {
  maybeAllDocsReplicate: maybeAllDocsReplicate
}

// Only try one shot if we've never seen this replication id.
function maybeAllDocsReplicate (localDb, onProgressCallback) {
  var remoteDb = this
  return generateReplicationId(remoteDb, localDb, {})
    .then(downloadRepId => {
      return localDb.get(downloadRepId).catch(resp => {
        return downloadReplication(remoteDb, localDb, downloadRepId, onProgressCallback)
          .then(() => uploadReplication(remoteDb, localDb))
      })
    })
}

function downloadReplication (remoteDb, localDb, downloadRepId, onProgressCallback) {
  return allDocsWithProgress(remoteDb, onProgressCallback)
    .then(function (response) {
      var docs = response.rows.map(row => row.doc)
      return localDb.bulkDocs({ docs, new_edits: false })
        .then(() => writeCheckpoint(remoteDb, localDb, downloadRepId, response.update_seq))
    })
}

function uploadReplication(remoteDb, localDb) {
  return generateReplicationId(localDb, remoteDb, {})
    .then(uploadRepId => {
      return remoteDb.get(uploadRepId).catch(() => {
        return localDb.info().then((info) => {
          return writeCheckpoint(localDb, remoteDb, uploadRepId, info.update_seq)
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

// 1. Couch doesn't respond with a Content-length header on _all_docs, so we guestimate total download
// from info.disk_size, then on complete call onProgressCallback with total / total to fix.
// 2. Using XMLHttpRequest over pouch.allDocs() to get progress events on the one http request.

function allDocsWithProgress (remoteDb, onProgressCallback) {
  return remoteDb.info().then(function (info) {
    var total = info.disk_size
    onProgressCallback(0, total)
    var url = remoteDb.name + '/_all_docs?include_docs=true&update_seq=true'
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest()
      xhr.withCredentials = true
      xhr.addEventListener('error', function (error) { reject(error) })
      xhr.addEventListener('abort', function (error) { reject(error) })
      xhr.addEventListener('progress', function (event) {
        if (xhr.status < 400) {
          onProgressCallback(event.loaded, total)
        }
      })
      xhr.addEventListener('load', function () {
        if (xhr.status >= 400) {
          reject(xhr.responseText)
        } else {
          onProgressCallback(total, total)
          var response = JSON.parse(xhr.responseText)
          resolve(response)
        }
      })
      xhr.open('GET', url)
      xhr.send()
    })
  })
}
