
module.exports = function() {

/* Sync Auth
 *
 * Uses the auth flow described here:
 *    https://docs.services.mozilla.com/token/user-flow.html
 */
function SyncAuth(tokenServerClient) {
  this.tokenServerClient = tokenServerClient;
}

/* Auth
 *
 * @param assertion
 *
 * @return Promise result resolves to:
 * {
 *  key: sync 1.1 Hawk key
 *  id: sync 1.1 Hawk id
 *  api_endpoint: sync 1.1 storage server uri
 * }
 */

SyncAuth.prototype.auth = function(assertion) {
  return this.tokenServerClient.get('/1.0/sync/1.1', {
      headers: {
        Authorization: "Browser-ID " + assertion
      },
      json: true
    })
    .then(function(result) {
      this.token = result;
      return result;
    }.bind(this));
};

return SyncAuth;

};

