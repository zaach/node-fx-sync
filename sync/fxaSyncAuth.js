
module.exports = function(FxaUser, Crypto) {
if (!FxaUser) FxaUser = require('./fxaUser')();
if (!Crypto) Crypto = require('./crypto')();

function FxaSyncAuth(syncAuth, options) {
  this.syncAuth = syncAuth;
  this.options = options;
}

FxaSyncAuth.prototype.auth = function(creds) {
  var user = new FxaUser(creds, this.options);
  return user.setup()
    .then(function() {
      this.keys = user.syncKey;
      return user.getAssertion(this.options.audience, this.options.duration);
    }.bind(this))
    .then(function(assertion) {
      var clientState = Crypto.computeClientState(user.syncKey);
      return this.syncAuth.auth(assertion, clientState);
    }.bind(this))
    .then(function(token) {
      return {
        token: token,
        keys: this.keys,
        credentials: {
          sessionToken: user.creds.sessionToken,
          keyPair: user._keyPair
        }
      };
    }.bind(this));
};

return FxaSyncAuth;

};
