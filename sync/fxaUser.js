
module.exports = function(xhr, jwcrypto, P, FxAccountsClient) {

if (!xhr) xhr = require('xmlhttprequest').XMLHttpRequest;
if (!jwcrypto) {
  jwcrypto = require('jwcrypto');
  require("jwcrypto/lib/algs/rs");
  require("jwcrypto/lib/algs/ds");
}
if (!P) P = require('p-promise');
if (!FxAccountsClient) FxAccountsClient = require('fxa-js-client');

var certDuration = 3600 * 24 * 365;

/*
 * 1. use fxa-client to log in to Fxa with email password
 * 2. generate a BrowserID keypair
 * 3. send public key to fxa server and get a cert
 * 4. generate a BrowserID assertion with the new cert
 */

function FxUser(creds, options) {
  this.email = creds.email;
  this.password = creds.password;
  this.options = options;
  this.client = new FxAccountsClient(
    this.options.fxaServerUrl || 'http://127.0.0.1:9000',
    { xhr: xhr }
  );
}

FxUser.prototype.auth = function() {
  var self = this;
  var creds;
  return this.client.signIn(
      this.email,
      this.password,
      { keys: true }
    )
    .then(function (creds) {
      self.creds = creds;
      return self.client.accountKeys(creds.keyFetchToken, creds.unwrapBKey);
    })
    .then(function (result) {
      self.creds.kB = result.kB;
      self.creds.kA = result.kA;
      return self;
    });
};

FxUser.prototype._exists = function(email) {
  var client = new FxAccountsClient(this.options.fxaServerUrl);
  return client.accountExists(email);
}

FxUser.prototype.setup = function() {
  var self = this;
  var client;

  // initialize the client and obtain keys
  return this.auth()
    .then(
      function () {
        return self.client.recoveryEmailStatus(self.creds.sessionToken);
      }
    )
    .then(
      function (status) {
        if (status.verified) {
          return self.creds;
        } else {
          // poll for verification or throw?
          throw new Error("Unverified account");
        }
      }
    )
    .then(
      function (creds) {
        // set the sync key
        self.syncKey = Buffer(creds.kB, 'hex');
        var deferred = P.defer();
        // upon allocation of a user, we'll gen a keypair and get a signed cert
        jwcrypto.generateKeypair({ algorithm: "DS", keysize: 256 }, function(err, kp) {
          if (err) return deferred.reject(err);

          var duration = self.options.certDuration || certDuration;

          self._keyPair = kp;
          var expiration = +new Date() + duration;

          self.client.certificateSign(self.creds.sessionToken, kp.publicKey.toSimpleObject(), duration)
            .done(
              function (cert) {
                self._cert = cert.cert;
                deferred.resolve(self);
              },
              deferred.reject
            );
        });
        return deferred.promise;
      }
    );
};

FxUser.prototype.getCert = function(keyPair) {
  var duration = typeof this.options.certDuration !== 'undefined' ?
                    this.options.certDuration :
                    60 * 60 * 1000;
  return this.client.certificateSign(this.creds.sessionToken, keyPair.publicKey.toSimpleObject(), duration)
    .done(
      function (cert) {
        self._cert = cert.cert;
        deferred.resolve(self);
      },
      deferred.reject
    );
};

FxUser.prototype.getAssertion = function(audience, duration) {
  var deferred = P.defer();
  var self = this;
  var expirationDate = +new Date() + (typeof duration !== 'undefined' ?  duration : 60 * 60 * 1000);

  jwcrypto.assertion.sign({},
    {
      audience: audience,
      issuer: this.options.fxaServerUrl,
      expiresAt: expirationDate
    },
    this._keyPair.secretKey,
    function(err, signedObject) {
      if (err) return deferred.reject(err);

      var backedAssertion = jwcrypto.cert.bundle([self._cert], signedObject);
      deferred.resolve(backedAssertion);
    });

  return deferred.promise;
};

return FxUser;

};
