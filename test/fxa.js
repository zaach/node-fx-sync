const crypto = require('crypto');
const assert = require('assert');

const Request = require('../lib/request')();
const SyncAuth = require('../lib/syncAuth')();
const FxaSyncAuth = require('../lib/fxaSyncAuth')();
const SyncClient = require('../lib/syncClient')();

const duration = 3600 * 24 * 365;
const syncAuthUrl = 'https://token.services.mozilla.com';
const fxaServerUrl = 'https://api.accounts.firefox.com/v1';
const email = 'youraccount@email.com';
const password = 'yourpassword';

function hash (bytes) {
  var sha = crypto.createHash('sha256');
  return sha.update(bytes).digest();
}

var syncAuth = new SyncAuth(syncAuthUrl);
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
