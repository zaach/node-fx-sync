const P = require('p-promise');
const HKDF = require('hkdf');
const crypto = require('crypto');
const jwcrypto = require('jwcrypto');
require("jwcrypto/lib/algs/rs");
require("jwcrypto/lib/algs/ds");
//const FxAccountsClient = require('picl-gherkin');
const FxAccountsClient = require('fxa-js-client');
const xhr = require('xmlhttprequest').XMLHttpRequest;

const Request = require('../lib/request')();
const SyncAuth = require('../lib/syncAuth')();
const FxaUser = require('../lib/fxaUser')(P, jwcrypto, FxAccountsClient, xhr);
const FxaSyncAuth = require('../lib/fxaSyncAuth')(FxaUser);
const SyncClient = require('../lib/syncClient')(Request, HKDF, P, crypto);

const assert = require('assert');

const duration = 3600 * 24 * 365;
const syncAuthUrl = 'https://token.services.mozilla.com';
const fxaServerUrl = 'https://api.accounts.firefox.com/v1';
const email = 'zack.carter+fxasync@gmail.com';
const password = 'password';

function hash (bytes) {
  var sha = crypto.createHash('sha256');
  return sha.update(bytes).digest();
}

var syncAuth = new SyncAuth(new Request(syncAuthUrl));
var auth = new FxaSyncAuth(syncAuth, {
  certDuration: duration,
  duration: duration,
  audience: syncAuthUrl,
  fxaServerUrl: fxaServerUrl,
  hash: hash
});

var syncClient;

auth.auth(email, password)
.then(function(creds) {
  console.log('creds', creds);

  var storageClient = new Request(creds.token.api_endpoint, {
    credentials: {
      id: creds.token.id,
      key: creds.token.key,
      algorithm: creds.token.hashalg
    }
  });
  syncClient = new SyncClient(storageClient, creds.keys);
})
.then(function() {
  return syncClient.info();
})
.then(function(info) {
  console.log('info', info);
})
.then(function() {
  return syncClient.fetchIDs('tabs');
})
.then(function(info) {
  console.log('tabs', info);
})
.then(function() {
  return syncClient.fetchIDs('clients');
})
.then(function(info) {
  console.log('clients', info);
})
.then(function() {
  return syncClient.fetchIDs('meta');
})
.then(function(info) {
  console.log('meta', info);
})
.then(function() {
  return syncClient.fetchIDs('crypto');
})
.then(function(info) {
  console.log('crypto', info);
})
.then(function() {
  return syncClient.fetchIDs('keys');
})
.then(function(info) {
  console.log('keys', info);
  return syncClient.prepare();
})
.then(function(data) {
  console.log('result ', data);
  assert.ok(syncClient.keyBundle.encKey, 'has encryption key');
  assert.ok(syncClient.keyBundle.hmacKey, 'has hmac key');
  return syncClient.fetchCollection('bookmarks');
})
.done(function(results) {
  console.log('bookmarks: ', results);
},
function (err) {
  console.error('error: ', err, err.stack);
});
