/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const jwcrypto = require('jwcrypto');
const P = require("p-promise");

require("jwcrypto/lib/algs/rs");
require("jwcrypto/lib/algs/ds");

// Private key from mockmyid.com
const MOCKMY_SECRET_KEY = jwcrypto.loadSecretKeyFromObject({
  algorithm: "DS",
  x: "385cb3509f086e110c5e24bdd395a84b335a09ae",
  p: "ff600483db6abfc5b45eab78594b3533d550d9f1bf2a992a7a8daa6dc34f8045ad4e6e0c429d334eeeaaefd7e23d4810be00e4cc1492cba325ba81ff2d5a5b305a8d17eb3bf4a06a349d392e00d329744a5179380344e82a18c47933438f891e22aeef812d69c8f75e326cb70ea000c3f776dfdbd604638c2ef717fc26d02e17",
  q: "e21e04f911d1ed7991008ecaab3bf775984309c3",
  g: "c52a4a0ff3b7e61fdf1867ce84138369a6154f4afa92966e3c827e25cfa6cf508b90e5de419e1337e07a2e9e2a3cd5dea704d175f8ebf6af397d69e110b96afb17c7a03259329e4829b0d03bbc7896b15b4ade53e130858cc34d96269aa89041f409136c7242a38895c9d5bccad4f389af1d7a4bd1398bd072dffa896233397a"
});

const MOCKMY_ISSUER = "mockmyid.com";

/*
 * Creates an IDP that can create users and
 * issue certs.
 *
 **/

function Idp(options) {
  if (!options) options = {};

  this.domain = options.issuer || MOCKMY_ISSUER;
  this.privateKey = options.privateKey || MOCKMY_SECRET_KEY;
}

Idp.prototype.createUser = function(options) {
  if (!options) options = {};
  if (!options.domain) options.domain = this.domain;
  if (!options.privateKey) options.privateKey = this.privateKey;

  var user = new User(options);
  return user.setup();
};

Idp.prototype.getAssertion = function(options) {
  return this.createUser(options)
  .then(function(user) {
    return user.getAssertion(options.audience, options.assertionDuration);
  });
};

function User(options) {
  this.options = options;
}

User.prototype.setup = function() {
  var deferred = P.defer();
  var self = this;
  var duration = typeof self.options.certDuration !== 'undefined' ?
                    self.options.certDuration :
                    60 * 60 * 1000;

  // upon allocation of a user, we'll gen a keypair and get a signed cert
  jwcrypto.generateKeypair({ algorithm: "DS", keysize: 256 }, function(err, kp) {
    if (err) return cb(err);

    self._keyPair = kp;

    var expiration = +new Date() + duration;

    jwcrypto.cert.sign(
      {
        publicKey: self._keyPair.publicKey,
        principal: { email: self.options.email }
      },
      {
        expiresAt: expiration,
        issuer: self.options.domain,
        issuedAt: new Date()
      },
      {}, self.options.privateKey, receiveCert
    );
  });

  function receiveCert(err, signedCert) {
    if (err) return deferred.reject(err);
    self._cert = signedCert;

    deferred.resolve(self);
  }

  return deferred.promise;
};

User.prototype.getAssertion = function(audience, duration) {
  var deferred = P.defer();
  var self = this;
  var expirationDate = +new Date() + (typeof duration !== 'undefined' ?  duration : 60 * 60 * 1000);

  jwcrypto.assertion.sign({},
    {
      audience: audience,
      issuer: this.options.domain,
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

module.exports = Idp;
