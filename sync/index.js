
// external dependencies
module.exports = function (P, crypto, HKDF, jwcrypto, FxAccountsClient, XHR) {

const Request = require('./request')(XHR);
const Crypto = require('./crypto')(P, HKDF, crypto);
const SyncAuth = require('./syncAuth')();
const FxaUser = require('./fxaUser')(P, jwcrypto, FxAccountsClient);
const FxaSyncAuth = require('./fxaSyncAuth')(FxaUser, Crypto);
const SyncClient = require('./syncClient')(Request, Crypto, P);

const DEFAULTS = {
  syncAuthUrl: 'https://token.services.mozilla.com',
  fxaServerUrl: 'https://api.accounts.firefox.com/v1',
  // certs last a year
  duration: 3600 * 24 * 365
};

function FxSync(creds, options) {
  if (!options) options = {};
  this._creds = creds || {};

  if (creds.authState) {
    this.authState = creds.authState || {};
    this._client = new SyncClient(this.authState);
  }

  var authUrl = options.syncAuthUrl || DEFAULTS.syncAuthUrl;
  var syncAuth = new SyncAuth(new Request(authUrl));

  this._authClient = new FxaSyncAuth(syncAuth, {
    certDuration: DEFAULTS.duration,
    duration: DEFAULTS.duration,
    audience: authUrl,
    fxaServerUrl: options.fxaServerUrl || DEFAULTS.fxaServerUrl
  });
}

FxSync.prototype.auth = function(creds) {
  return this._auth(creds).then(function() {
    return this.authState;
  });
};

FxSync.prototype._auth = function(creds) {
  if (this._client) return this._client.prepare();

  return this._authClient.auth(creds || this._creds)
    // save credentials
    .then(function(authState) {
      this.authState = authState;
      this._client = new SyncClient(this.authState);
      return this._client.prepare();
    }.bind(this));
};

FxSync.prototype.fetch = function(collection) {
  return this._auth().then(function() {
    return this._client.fetchCollection(collection);
  }.bind(this));
};

return FxSync;

};
