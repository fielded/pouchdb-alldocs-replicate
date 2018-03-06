var PouchDB = require('pouchdb-core')
var idbAdapter = require('pouchdb-adapter-idb')
var httpAdapter = require('pouchdb-adapter-http')
var replication = require('pouchdb-replication')
var allDocsReplicate = require('./../index')

PouchDB
  .plugin(idbAdapter)
  .plugin(httpAdapter)
  .plugin(replication)
  .plugin(allDocsReplicate)

var dbName = 'sync-test'
// assumes auth cookie set
var remoteUrl = 'http://localhost:5984/'
var remoteDbUrl = remoteUrl + dbName

var localDb = new PouchDB(dbName)
var remoteDb = new PouchDB(remoteDbUrl)

var syncFeed = null

document.querySelector('.reset').addEventListener('click', function (event) {
  if (syncFeed) {
    syncFeed.cancel()
    syncFeed = null
  }
  localDb.destroy().then(function () {
    localDb = new PouchDB(dbName)
    console.log('Local database reset')
  })
})

document.querySelector('.start').addEventListener('click', function (event) {
  function onProgressUpdates (bytesDownloaded, totalBytes) {
    console.log(bytesDownloaded, totalBytes)
  }
  remoteDb.maybeAllDocsReplicate(localDb, onProgressUpdates).then(() => {
    console.log('all docs replicate complete')
  }).catch(function (error) {
    console.log('all docs error', error)
  })
})

document.querySelector('.live').addEventListener('click', function (event) {
  if (!syncFeed) {
    syncFeed = PouchDB.sync(localDb, remoteDb, { live: true, retry: true })
      .on('change', function (info) {
        console.log('sync change event', info)
      }).on('paused', function (error) {
        console.log('sync paused event', error)
      }).on('active', function () {
        console.log('sync active event')
      }).on('denied', function (error) {
        console.log('sync denied event', error)
      }).on('complete', function (info) {
        console.log('sync complete event', info)
      }).on('error', function (error) {
        console.log('sync error event', error)
      })
  }
})

document.querySelector('.add-remote-doc').addEventListener('click', function (event) {
  remoteDb.put({
    _id: new Date().toISOString()
  })
})

document.querySelector('.add-local-doc').addEventListener('click', function (event) {
  localDb.put({
    _id: new Date().toISOString()
  })
})

document.querySelector('.get-local-info').addEventListener('click', function (event) {
  localDb.info().then(function (info) {
    console.log(info)
  })
})

document.querySelector('.get-remote-info').addEventListener('click', function (event) {
  remoteDb.info().then(function (info) {
    console.log(info)
  })
})

document.querySelector('.get-with-progress').addEventListener('click', function (event) {
  remoteDb.getWithProgress(remoteDbUrl + '/_all_docs').then(function (docs) {
  }).catch(function (error) {
    console.log(error)
  })
})
