
module.exports = function(Request, HKDF, P, crypto) {
  if (!Request) Request = require('./request');
  if (!HKDF) HKDF = require('hkdf');
  if (!P) P = require('p-promise');
  if (!crypto) crypto = require('crypto');

/* Sync client
 * Uses the auth flow described here:
 *    https://docs.services.mozilla.com/token/user-flow.html
 *
 * to obtain a client that can speak:
 *    https://docs.services.mozilla.com/storage/apis-1.1.html
 */

function SyncClient(client, syncKey) {
  this.client = client;
  this.syncKey = syncKey;
}

// their default collection keys:
// enckey "mGBQWTENaXcnknl4nm2GyX8RCi+KkRquGwYp48TPP1I="
// hmackey "kEHtl0kKK4qbanGOTj0b4g+ziok9WtZus8vhmIkvFvY="

// syncKeyBundle
// enc: M2WxH2kvEDlRW3kgPV9KMbI047UPzdVj9X2WSNcaqME=
// hmac: Cxbz9pbZ6RMkyeUXu9Uo4ZTebzp34yjY38/Z14ORSaM=


SyncClient.prototype.prepare = function(syncKey) {
  return (this.keyBundle ?
      P.resolve(this.keyBundle) :
      this._deriveKeys(syncKey || this.syncKey))
    .then(this._fetchCollectionKeys.bind(this));
};

SyncClient.prototype._deriveKeys = function(syncKey) {
  return hkdf(syncKey, "oldsync", undefined, 2 * 32)
    .then(function (bundle) {
      this.keyBundle = {
        encKey: bundle.slice(0, 32),
        hmacKey: bundle.slice(32, 64)
      };

      return this.keyBundle;
    }.bind(this));
};

SyncClient.prototype._fetchCollectionKeys = function(keyBundle) {
  return this.client.get('/storage/crypto/keys')
    .then(function (wbo) {
      var decrypted = decryptWBO(keyBundle || this.keyBundle, wbo);
      this.collectionKeys = {
        default: {
          encKey: Buffer(decrypted.default[0], 'base64'),
          hmacKey: Buffer(decrypted.default[1], 'base64')
        }
      };

      return this.collectionKeys;
    }.bind(this),
    function(err) {
      throw new Error("No collection keys found. Have you set up Sync in your browser?");
    });
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
        return decryptWBO(keyBundle, wbo);
      });
    });
};


// useful source: https://github.com/mozilla-services/ios-sync-client/blob/master/Sources/NetworkAndStorage/CryptoUtils.m
function decryptWBO(keyBundle, wbo) {
  if (!wbo.payload) {
    throw new Error("No payload: nothing to decrypt?");
  }
  var payload = JSON.parse(wbo.payload);
  if (!payload.ciphertext) {
    throw new Error("No ciphertext: nothing to decrypt?");
  }

  if (!keyBundle) {
    throw new Error("A key bundle must be supplied to decrypt.");
  }

  // Authenticate the encrypted blob with the expected HMAC
  var computedHMAC = crypto.createHmac('sha256', keyBundle.hmacKey)
                      .update(payload.ciphertext)
                      .digest('hex');

  if (computedHMAC != payload.hmac) {
    throw new Error('Incorrect HMAC. Got ' + computedHMAC + '. Expected ' + payload.hmac + '.');
  }

  var iv = Buffer(payload.IV, 'base64').slice(0, 16);
  var decipher = crypto.createDecipheriv('aes-256-cbc', keyBundle.encKey, iv)
  var plaintext = decipher.update(payload.ciphertext, 'base64', 'utf8')
  plaintext += decipher.final('utf8');

  var result = JSON.parse(plaintext);

  // Verify that the encrypted id matches the requested record's id.
  if (result.id !== wbo.id) {
    throw new Error("Record id mismatch: " + result.id + " !== " + wbo.id);
  }

  return result;
}


function kw(name) {
  return 'identity.mozilla.com/picl/v1/' + name
}

function hkdf(km, info, salt, len) {
  var d = P.defer()
  var df = new HKDF('sha256', salt, km)
  df.derive(
    kw(info),
    len,
    function(key) {
      d.resolve(key)
    }
  )
  return d.promise
}

SyncClient.decryptWBO = decryptWBO;

return SyncClient;

};
