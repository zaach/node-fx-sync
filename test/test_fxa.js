const FxaUser = require('../fxa');
const SyncClient = require('../sync');
const assert = require('assert');
const fxaClient = require('gherkin');
const jwcrypto = require('jwcrypto');

require("jwcrypto/lib/algs/rs");
require("jwcrypto/lib/algs/ds");

const duration = 3600 * 24 * 365;
const audience = 'http://auth.oldsync.dev.lcip.org';
const fxaServerUrl = 'https://idp.dev.lcip.org';
const email = 'zack.carter+sync2node@gmail.com';
const password = 'password';

const user = new FxaUser(email, password, {
  certDuration: duration,
  fxaServerUrl: fxaServerUrl,
  fxaClient: fxaClient,
  jwcrypto: jwcrypto
});
var syncClient = new SyncClient({ url: audience });
var collecton;

user.setup()
.then(function() {
  console.log('done setting up user');
  assert.ok(user.syncKey);
  return syncClient.deriveKeys(user.syncKey);
})
.then(function(bundle) {
  console.log('done deriving sync key:', bundle);
  assert.ok(syncClient.keyBundle.encKey, 'has encryption key');
  assert.ok(syncClient.keyBundle.hmacKey, 'has hmac key');
  return user.getAssertion(audience, duration);
})
.then(function(assertion) {
  console.log(assertion);
  assert.ok(assertion, 'has assertion');
  return syncClient.auth(assertion);
})
.then(function(info) {
  console.log('auth result:', info);
  return syncClient.get('/info/collections');
})
.then(function(results) {
  console.log('info/collections: ', results);
  return syncClient.get('/storage/keys');
})
.then(function(results) {
  console.log('/storage/keys', results);
  return syncClient.get('/storage/crypto');
})
.then(function(results) {
  console.log('/storage/crypto', results);
  // results[0] should be the key "keys"
  return syncClient.fetchCollectionKeys();
})
.then(function(results) {
  console.log('decrypted keys: ', results);
  return syncClient.fetchCollection('tabs');
})
.done(function(results) {
  console.log('tabs: ', results);
},
function (err) {
  console.error('error: ', err);
});
