
module.exports = function(P, jwcrypto, FxAccountsClient) {

/*
 * 1. use gherkin to log in to Fxa with email password
 * 2. generate a keypair
 * 3. send public key to fxa server and get a cert
 * 4. generate an assertion with the new cert
 */

function FxUser(email, password, options) {
  this.email = email;
  this.password = password;
  this.options = options;
}


function until (condFn, interval) {
  return condFn.then(function (done) {
    var deferred = P.defer();
    if (done) {
      return true;
    }
    setTimeout(until.bind(null, condFn, interval), interval);
  });
}

FxUser.prototype._create = function() {

  return FxAccountsClient.create(
      this.options.fxaServerUrl || 'http://127.0.0.1:9000',
      this.email,
      this.password
    )
    .then(function (client) {
      this.client = client;
      return client;
    }.bind(this))
};

// conditionally create an account if needed and log in
FxUser.prototype.auth = function() {
  return this._exists(this.email)
    .then(function(exists) {
      if (exists) {
        return FxAccountsClient.login(
          this.options.fxaServerUrl || 'http://127.0.0.1:9000',
          this.email,
          this.password
        ).then(function(client) {
          this.client = client;
          return client;
        }.bind(this));
      } else {
        return this._create().then(function(client) {
          return this.client.login()
            .then(function() { return client; });
        }.bind(this));
      }
    }.bind(this));
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
      function (_client) {
        if (_client) client = _client;
        return client.emailStatus();
      }
    )
    .then(
      function (status) {
        console.log('status: ', status)
        if (status.verified) {
          return client.keys()
        } else {
          // poll for verification or throw?
          throw new Error("Unverified account");
        }
      }
    )
    .then(
      function (keys) {
        // set the sync key
        self.syncKey = Buffer(keys.kB, 'hex');
        var deferred = P.defer();
        // upon allocation of a user, we'll gen a keypair and get a signed cert
        jwcrypto.generateKeypair({ algorithm: "DS", keysize: 256 }, function(err, kp) {
          if (err) return deferred.reject(err);

          self._keyPair = kp;
          var expiration = +new Date() + duration;

          client.sign(kp.publicKey.toSimpleObject(), duration)
            .done(
              function (cert) {
                console.log('got cert', cert);
                self._cert = cert;
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
  return client.sign(keyPair.publicKey.toSimpleObject(), duration)
    .done(
      function (cert) {
        console.log('got cert', cert);
        self._cert = cert;
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
