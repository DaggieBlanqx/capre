'use strict'


var EventEmitter = require('events').EventEmitter

var util = require('util')

var path = require('path')

var enode = require('enode')
var Capre = require('../capre')
var _ = require('underscore')

var Slave = function(backend, options) {
  backend = backend || 'json'
  options = options || {
    file: path.join(process.cwd(), 'tests/tmp/slave.json')
  }
  this._type = null
  var self = this
  var Backend = require('../capre/adaptors/' + backend)

  this.backend = new Backend(options, function() {
    self.capre = new Capre(self.backend, function(err) {
      if (err) self.emit('error', err)
      self._capre_ready = true
      self.emit('capre-ready')
    })
  })
  // Connect to remote
  this.connect = function(port, callback) {
    var connect = function() {
      var super_ = Object.getPrototypeOf(self)
      return super_.connect.call(self, port, function(err, remote, connection) {
        if (err) callback(err)
        self.remote = remote
        callback(err, remote, connection)
      })
    }
    // wait for server to initialise
    if (!self._capre_ready) {
      self.on('capre-ready', function() {
        connect()
      })
    } else {
      connect()
    }
    return self
  }
}

util.inherits(Slave, enode.Client)

//// Set type for this slave
//Slave.prototype.use = function(type) {
  //this._type = type
  //return this
//}

// Flush slave
Slave.prototype.flush = function(callback) {
  this.capre.flush(callback)
}


Slave.prototype.setSyndex = function(type, syndex, callback) {
  var callback = (typeof arguments[arguments.length - 1] === 'function') ? arguments[arguments.length - 1] : function() {}
  type = type || this.type
  if (!type || typeof type !== 'string') return callback(new Error('type required'))
  var capre = this.capre
  capre._registerIfMissing(type, function(err) {
    capre.setSyndex(type, syndex, callback)
  })
}

// Get Sync info from remote
Slave.prototype.sync = function(type, callback) {
  var callback = (typeof arguments[arguments.length - 1] === 'function') ? arguments[arguments.length - 1] : function() {}
  type = type || this.type
  if (!type || typeof type !== 'string') return callback(new Error('type required'))
  var self = this
  var capre = this.capre
  var remote = this.remote
  capre._registerIfMissing(type, function(err) {
    if (err) return callback(err)
    // get syndex from local capre
    capre.getSyndex(type, function(err, syndex) {
      if (err) return callback(err)
      // sync with server using that syndex
      remote.sync(type, syndex, function(err, items, typeInfo) {
        if (err) return callback(err)
        // update syndex in local capre
        capre.setSyndex(type, typeInfo.syndex, function() {
          // return out of sync items
          callback(null, items, typeInfo.syndex)
        })
      })
    })
  })
}



module.exports = Slave