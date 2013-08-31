const request = require('request');
const fs = require('fs');
const P = require("p-promise");
const Hawk = require("hawk");

/* Sync client
 * Uses the auth flow described here:
 *    https://docs.services.mozilla.com/token/user-flow.html
 *
 * to obtain a client that can speak:
 *    https://docs.services.mozilla.com/storage/apis-1.1.html
 */

function SyncClient(options) {
  this.url = options.url;
}

SyncClient.prototype.auth = function(assertion) {
  var deferred = P.defer();

  request.get({
    uri: this.url + '/1.0/sync/1.1',
    headers: {
      Authorization: "Browser-ID " + assertion
    },
    json: true
  }, function (err, r, body) {
    if (err) return deferred.reject(err);
    this.token = body;
    deferred.resolve(body);
  }.bind(this));

  return deferred.promise;
};

SyncClient.prototype.request = function(path, options) {
  if (! options) options = {};
  if (typeof path === 'string') {
    options.path = path;
  } else {
    options = path;
  }
  if (! options.method) options.method = 'GET';
  if (! options.headers) options.headers = {};

  var deferred = P.defer();

  var credentials = {
    id: this.token.id,
    key: this.token.key,
    algorithm: 'sha256'
  };

  options.uri = this.token.api_endpoint + options.path;

  var header = Hawk.client.header(options.uri, 'GET', { credentials: credentials });
  options.headers.Authorization = header.field;

  request(options, function (err, response, body) {
    if (err) return deferred.reject(err);

    var isValid = Hawk.client.authenticate(response, credentials, header.artifacts, { payload: body });
    if (!isValid) return deferred.reject('invalid MAC');
    deferred.resolve(body);
  });

  return deferred.promise;
};

module.exports = SyncClient;
