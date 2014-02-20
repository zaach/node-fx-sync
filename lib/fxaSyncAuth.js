
module.exports = function(FxaUser) {

function FxaSyncAuth(syncAuth, options) {
  this.syncAuth = syncAuth;
  this.options = options;
}

FxaSyncAuth.prototype.auth = function(email, password) {
  var user = new FxaUser(email, password, this.options);
  return user.setup()
    .then(function() {
      this.keys = user.syncKey;
      return user.getAssertion(this.options.audience, this.options.duration);
    }.bind(this))
    .then(this.syncAuth.auth.bind(this.syncAuth))
    .then(function(token) {
      console.log('got tokens hahahah', token, this.keys);
      return {
        token: token,
        keys: this.keys
        credentials: {
          sessionToken: user.sessionToken,
          keyPair: user.keyPair
        }
      };
    }.bind(this));
};

FxaSyncAuth.prototype.refreshAuth = function(creds) {
  var user = new FxaUser(
};

FxaSyncAuth.prototype.creds = function(creds) {
};

return FxaSyncAuth;

};
