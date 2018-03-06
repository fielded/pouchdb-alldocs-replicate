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
var remoteUrl = 'http://admin:admin@localhost:5984/'
var remoteDbUrl = remoteUrl + dbName

var localDb = new PouchDB(dbName)
var remoteDb = new PouchDB(remoteDbUrl)



document.querySelector('.destroy').addEventListener('click', function (event) {
  localDb.destroy()
})

document.querySelector('.start').addEventListener('click', function (event) {
  remoteDb.maybeAllDocsReplicate(localDb).then(() => {
    console.log('all docs replicate complete')
  })
})

document.querySelector('.live').addEventListener('click', function (event) {
  PouchDB.sync(localDb, remoteDb, { live: true, retry: true })
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
