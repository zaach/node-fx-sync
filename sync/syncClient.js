
module.exports = function(Request, Crypto, P) {

if (!Request) Request = require('./request')();
if (!Crypto) Crypto = require('./crypto')();
if (!P) P = require('p-promise');

/* Sync client
 * Uses the auth flow described here:
 *    https://docs.services.mozilla.com/token/user-flow.html
 *
 * to obtain a client that can speak:
 *    https://docs.services.mozilla.com/storage/apis-1.1.html
 */

function SyncClient(creds) {
  this.client = new Request(creds.token.api_endpoint, {
    credentials: {
      id: creds.token.id,
      key: creds.token.key,
      algorithm: creds.token.hashalg
    }
  });
  this.syncKey = creds.keys;
  this.keyBundle = creds.keyBundle;
}

SyncClient.prototype.prepare = function(syncKey) {
  return this._deriveKeys(syncKey)
    .then(function () {
      return this._fetchCollectionKeys();
    }.bind(this));
};

SyncClient.prototype._deriveKeys = function(syncKey) {
  if (!syncKey && this.keyBundle) return P(this.keyBundle);

  return Crypto.deriveKeys(syncKey || this.syncKey)
    .then(function (bundle) {
      return this.keyBundle = bundle;
    }.bind(this));
};

SyncClient.prototype._fetchCollectionKeys = function(keyBundle) {
  if (!keyBundle && this.collectionKeys) return P(this.collectionKeys);

  return this.client.get('/storage/crypto/keys')
    .then(function (wbo) {
      return Crypto.decryptCollectionKeys(keyBundle || this.keyBundle, wbo);
    }.bind(this),
    function(err) {
      throw new Error("No collection keys found. Have you set up Sync in your browser?");
    })
    .then(function (collectionKeys) {
      return this.collectionKeys = collectionKeys;
    }.bind(this));
};

SyncClient.prototype._collectionKey = function (collection) {
  return this.collectionKeys[collection] || this.collectionKeys.default;
};

SyncClient.prototype.info = function(collection) {
  return this.client.get('/info/collections');
};

var VALID_OPTIONS = ['ids', 'newer', 'full', 'limit', 'offset', 'sort'];

function options2query(options) {
  return Object.keys(options)
    .filter(function (val) {
      return VALID_OPTIONS.indexOf(val) !== -1;
    }).map(function (val) {
      return val + '=' + encodeURIComponent(serialize(options[val]));
    }).join('&');
}

function serialize (val) {
  return Array.isArray(val) ? val.join(',') : val;
}

SyncClient.prototype.fetchCollection = function(collection, options) {
  var query = options ? '?' + options2query(options) : '';
  var full = options && options.full;

  return this.client.get('/storage/' + collection + query)
    .then(function (objects) {

      return full ?
        objects.map(function (wbo) {
          return Crypto.decryptWBO(this._collectionKey(collection), wbo);
        }.bind(this)) :
        objects;
    }.bind(this));
};

return SyncClient;

};
