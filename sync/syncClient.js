
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

SyncClient.prototype.fetchIDs = function(collection) {
  return this.client.get('/storage/' + collection)
    .then(function (ids) {
      return ids;
    });
};

SyncClient.prototype.fetchCollection = function(collection) {
  var keyBundle = this._collectionKey(collection);
  return this.client.get('/storage/' + collection + "?full=true")
    .then(function (wbos) {
      return wbos.map(function (wbo) {
        return Crypto.decryptWBO(keyBundle, wbo);
      });
    });
};

return SyncClient;

};
