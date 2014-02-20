
// external dependencies
module.exports = function (P, crypto, HKDF, jwcrypto, FxAccountsClient, XHR) {

const Request = require('../lib/request')(XHR);
const SyncAuth = require('../lib/syncAuth')();
const FxaUser = require('../lib/fxaUser')(P, jwcrypto, FxAccountsClient);
const FxaSyncAuth = require('../lib/fxaSyncAuth')(FxaUser);
const SyncClient = require('../lib/syncClient')(Request, HKDF, P, crypto);

// certs last a year
const duration = 3600 * 24 * 365;

var defopts = {
  syncAuthUrl: 'http://auth.oldsync.dev.lcip.org',
  fxaServerUrl: 'https://api-accounts.dev.lcip.org',
};

function Sync(db, options) {
  this._db = db;
  var authUrl = options.syncAuthUrl || defopts.syncAuthUrl;
  var syncAuth = new SyncAuth(new Request(authUrl));
  this._auth = new FxaSyncAuth(syncAuth, {
    certDuration: duration,
    duration: duration,
    audience: authUrl,
    fxaServerUrl: options.fxaSyncAuth || defopts.fxaSyncAuth
  });
}

Sync.prototype.signIn = function(email, password) {
  return this._auth.auth(email, password)
    // save credentials
    .then(function(creds) {
    });
};

};
