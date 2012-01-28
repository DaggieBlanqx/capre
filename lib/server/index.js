'use strict'

var enode = require('enode')
var util = require('util')
var Capre = require('../capre')
var _ = require('underscore')

var Server = function(backend) {
  Server.super_.call(this)
  var self = this
  var Backend = require('../capre/adaptors/' + backend)
  this.backend = new Backend(function() {
    self.capre = new Capre(self.backend, function(err) {
      if (err) self.emit('error', err); 
    })
    // set up capre methods as remote methods
    _.each(Object.getPrototypeOf(self.capre), function(value, key) {
      self._api[key] = function() {
        var args = Array.prototype.slice.apply(arguments)
        args.pop() // pop off meta
        self.capre[key].apply(self.capre, args)
      }
    })
  })
}

util.inherits(Server, enode.Server)

module.exports = Server