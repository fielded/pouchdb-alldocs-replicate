const PouchDB = require('pouchdb-core')
const allDocsReplicatePlugin = require('./dist/pouchdb-alldocs-replicate')
const sinon = require('sinon')

const tap = require('tap')

PouchDB.plugin(require('pouchdb-replication'))
PouchDB.plugin(require('pouchdb-adapter-memory'))
PouchDB.plugin(allDocsReplicatePlugin)

const responseHeaders = { "Content-Type": "application/json" }
const remoteDocs = [
  { doc: { _id: 'a', _rev: '1-1' } },
  { doc: { _id: 'b', _rev: '1-1' } }
]
const allDocsResponse = JSON.stringify({
  update_seq: 123,
  rows: remoteDocs
})
const remoteDiskSize = 50000

let requests
let remoteDb
let localDb

tap.beforeEach((done) => {
  requests = []
  global.XMLHttpRequest = sinon.useFakeXMLHttpRequest()
  global.XMLHttpRequest.onCreate = function (xhr) {
    requests.push(xhr)
  }
  remoteDb = new PouchDB('remote', { adapter: 'memory' })
  localDb = new PouchDB('abuja', { adapter: 'memory' })
  remoteDb.info = () => Promise.resolve({ disk_size: remoteDiskSize })
  done()
})

tap.afterEach((done) => {
  global.XMLHttpRequest.restore()
  remoteDb.destroy().then(() => localDb.destroy())
  .then(() => done())
})

tap.test('All docs replicate', t => {
  const progressUpdates = []
  const onProgressCallback = (progressCount, totalCount) => {
    progressUpdates.push({ progressCount, totalCount })
  }
  remoteDb.maybeAllDocsReplicate(localDb, onProgressCallback).then(() => {
    localDb.allDocs().then(docs => {
      t.equals(docs.rows.length, remoteDocs.length, 'to replicate all docs from remote to local')
      t.ok(progressUpdates.length > 0, 'to have called the callback with progress updates')
      t.equals(progressUpdates[0].progressCount, 0, 'to have the first progress update size equal zero')
      const finalTotalCount = progressUpdates[progressUpdates.length - 1].totalCount
      t.equals(finalTotalCount, remoteDiskSize, 'to have the final progress updates totals match disk size')
      t.end()
    })
  })
  setTimeout(() => {
    requests[0].respond(200, responseHeaders, allDocsResponse)
  }, 50)
})


tap.test('Live sync after bulk docs replication', t => {
  const onChanges = sinon.spy()
  // We get two paused events from the two way replication
  let firstPauseComplete = false
  remoteDb.maybeAllDocsReplicate(localDb, () => {}).then(() => {
    const syncFeed = PouchDB.sync(remoteDb, localDb, { live: true })
      .on('change', onChanges)
      .on('paused', () => {
        if (!firstPauseComplete) {
          firstPauseComplete = true
        } else {
          t.ok(onChanges.notCalled, 'to make no new changes')
          syncFeed.cancel()
          t.done()
        }
      })
  })
  setTimeout(() => {
    requests[0].respond(200, responseHeaders, allDocsResponse)
  }, 50)
})

tap.test('Bad responses', t => {
  remoteDb.maybeAllDocsReplicate(localDb, () => {}).catch(error => {
    t.ok(true, 'can be safely caught')
    t.end()
  })
  setTimeout(() => {
    requests[0].respond(500, responseHeaders)
  }, 50)
})
