'use strict'

const Suite = require('benchmark').Suite
const http = require('http')
const fs = require('fs')
const request = require('request')
const async = require('async')
const Wreck = require('wreck')
const mkdirp = require('mkdirp')
const rimraf = require('rimraf')

const suite = new Suite()

const basePath = `${__dirname}/downloads`

const files = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => `${i}.zip`)

function setup () {
  mkdirp.sync(basePath)
}

function teardown () {
  rimraf.sync(basePath)
}

suite.add('core - defaults', {
  defer: true,
  setup: setup,
  teardown: teardown,
  fn: deferred => {
    function makeRequest(name, done) {
      var file = fs.createWriteStream(`${basePath}/${name}`)
      var req = http.request({
        port: 80,
        hostname: '127.0.0.1',
        method: 'GET',
        path: `/${name}`
      })
      req.on('response', response => {
        response.pipe(file)
        file.on('finish', done)
      })
      req.end()
    }

    async.each(files, makeRequest, () => deferred.resolve())
  }
})
suite.add('core - keepalive', {
  defer: true,
  setup: setup,
  teardown: teardown,
  fn: deferred => {
    var agent = new http.Agent({
      keepAlive: true,
      keepAliveMsecs: 500,
      maxSockets: 3,
      maxFreeSockets: 3
    })
    function makeRequest(name, done) {
      var file = fs.createWriteStream(`${basePath}/${name}`)
      var req = http.request({
        port: 80,
        hostname: '127.0.0.1',
        method: 'GET',
        path: `/${name}`,
        agent: agent
      })
      req.on('response', response => {
        response.pipe(file)
        file.on('finish', done)
      })
      req.end()
    }

    async.each(files, makeRequest, () => {
      agent.destroy()
      deferred.resolve()
    })
  }
})
.add('request - defaults', {
  defer: true,
  setup: setup,
  teardown: teardown,
  fn: deferred => {
    function makeRequest(name, done) {
      var file = fs.createWriteStream(`${basePath}/${name}`)
      request(`http://127.0.0.1/${name}`, (err, resp, body) => {
        resp.pipe(file)
        file.on('finish', done)
      })
    }

    async.each(files, makeRequest, () => deferred.resolve())
  }
})
.add('request - keepalive', {
  defer: true,
  setup: setup,
  teardown: teardown,
  fn: deferred => {
    function makeRequest(name, done) {
      var file = fs.createWriteStream(`${basePath}/${name}`)
      request({
        uri: `http://127.0.0.1/${name}`,
        method: 'GET',
        forever: true
      }, (err, resp, body) => {
        resp.pipe(file)
        file.on('finish', done)
      })
    }

    async.each(files, makeRequest, () => deferred.resolve())
  }
})
.add('wreck - defaults', {
  defer: true,
  setup: setup,
  teardown: teardown,
  fn: deferred => {
    function makeRequest(name, done) {
      var file = fs.createWriteStream(`${basePath}/${name}`)
      Wreck.request('GET', `http://127.0.0.1/${name}`, {}, (err, resp) => {
        resp.pipe(file)
        file.on('finish', done)
      })
    }

    async.each(files, makeRequest, () => deferred.resolve())
  }
})
.on('cycle', event => {
  console.log(String(event.target))
})
.on('complete', function () {
  console.log('Fastest is ' + this.filter('fastest').pluck('name'))
})
.run({
  'async': true
})
