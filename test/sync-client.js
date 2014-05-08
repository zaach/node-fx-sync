const crypto = require('crypto');
const assert = require('assert');

const Request = require('../sync/request')();
const SyncAuth = require('../sync/syncAuth')();
const FxaSyncAuth = require('../sync/fxaSyncAuth')();
const SyncClient = require('../sync/syncClient')();

const duration = 3600 * 24 * 365;
const syncAuthUrl = 'https://token.services.mozilla.com';
const fxaServerUrl = 'https://api.accounts.firefox.com/v1';

var creds;

try {
  creds = require('./creds.json');
} catch (e) {
  throw new Error('Create a new Sync account in Firefox >=29 and put your credentials in test/creds.json');
}

const email = creds.email;
const password = creds.password;

var syncAuth = new SyncAuth(syncAuthUrl);
var auth = new FxaSyncAuth(syncAuth, {
  certDuration: duration,
  duration: duration,
  audience: syncAuthUrl,
  fxaServerUrl: fxaServerUrl
});

var syncClient;

auth.auth(creds)
.then(function(creds) {
  console.log('creds??', creds);

  syncClient = new SyncClient(creds);
  return syncClient.prepare();
})
.then(function() {
  return syncClient.info();
})
.then(function(info) {
  console.log('info', info);
})
.then(function() {
  return syncClient.fetchCollection('tabs');
})
.then(function(info) {
  console.log('tabs', info);
})
.then(function() {
  return syncClient.fetchCollection('clients');
})
.then(function(info) {
  console.log('clients', info);
})
.then(function() {
  return syncClient.fetchCollection('meta');
})
.then(function(info) {
  console.log('meta', info);
})
.then(function() {
  return syncClient.fetchCollection('crypto');
})
.then(function(info) {
  console.log('crypto', info);
})
.then(function() {
  return syncClient.fetchCollection('keys');
})
.then(function(info) {
  console.log('keys', info);
  return syncClient.prepare();
})
.then(function(data) {
  console.log('result ', data);
  assert.ok(syncClient.keyBundle.encKey, 'has encryption key');
  assert.ok(syncClient.keyBundle.hmacKey, 'has hmac key');
  return syncClient.fetchCollection('tabs', { full: true });
})
.done(function(results) {
  console.log('bookmarks: ', results[0]);
},
function (err) {
  console.error('error: ', err, err.stack);
});
