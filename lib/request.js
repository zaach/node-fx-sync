
module.exports = function (XHR, hawkClient, P) {
if (!P) P = require("p-promise");
if (!XHR) XHR = require("xmlhttprequest").XMLHttpRequest;
if (!hawkClient) hawkClient = require("hawk").client;

function Request(baseUrl, options) {
  this.baseUrl = baseUrl;
  this.credentials = options && options.credentials;
}

Request.prototype.get = function(path, options) {
  if (!options) options = {};
  options.method = 'GET';
  return this.request(path, options);
};

Request.prototype.post = function(path, payload, options) {
  if (!options) options = {};
  options.method = 'POST';
  options.json = payload;
  return this.request(path, options);
};

Request.prototype.put = function(path, payload, options) {
  if (!options) options = {};
  options.method = 'PUT';
  options.json = payload;
  return this.request(path, options);
};

Request.prototype.request = function request(path, options) {
  var deferred = P.defer();
  var xhr = new XHR();
  var uri = this.baseUrl + path;
  var credentials = options.credentials || this.credentials;
  var payload;

  if (options.json) {
    payload = JSON.stringify(options.json);
  }

  xhr.open(options.method, uri);
  xhr.onerror = function onerror() {
    deferred.reject(xhr.responseText);
  };
  xhr.onload = function onload() {
    var result;
    if (xhr.responseText === 'Unauthorized') return deferred.reject(xhr.responseText);
    try {
      result = JSON.parse(xhr.responseText);
    } catch (e) {
      return deferred.reject(xhr.responseText);
    }
    if (result.error || xhr.status >= 400) {
      return deferred.reject(result);
    }
    deferred.resolve(result);
  };


  // calculate Hawk header if credentials are supplied
  if (credentials) {
    var authHeader = hawkClient.header(uri, options.method, {
                        credentials: credentials,
                        payload: payload,
                        contentType: "application/json"
                      });
    xhr.setRequestHeader("authorization", authHeader.field);
  }

  for (var header in options.headers) {
    xhr.setRequestHeader(header, options.headers[header]);
  }

  xhr.setRequestHeader("Content-Type", "application/json");

  xhr.send(payload);

  return deferred.promise;
};

return Request;

}
