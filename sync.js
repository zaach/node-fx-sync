const request = require('request');
const fs = require('fs');
const P = require("p-promise");

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

SyncClient.prototype.get = function(path) {
  return this.request(path, { method: 'GET' });
};

SyncClient.prototype.post = function(path, payload) {
  return this.request(path, { method: 'POST', json: payload });
};

SyncClient.prototype.put = function(path, payload) {
  return this.request(path, { method: 'PUT', json: payload });
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

  options.hawk = {
    credentials: {
      id: this.token.id,
      key: this.token.key,
      algorithm: 'sha256'
    }
  };

  options.uri = this.token.api_endpoint + options.path;

  request(options, function (err, response, body) {
    if (err) return deferred.reject(err);
    if (body === 'Unauthorized') return deferred.reject(body);

    deferred.resolve(body);
  });

  return deferred.promise;
};

module.exports = SyncClient;
