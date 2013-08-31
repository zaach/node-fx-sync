const Idp = require('../idp');
const SyncClient = require('../sync');

const expiresAt = new Date().valueOf() + 3600 * 24 * 365;
const audience = 'http://auth.oldsync.dev.lcip.org';
const email = 'tester@mockmyid.com';

const mockIdp = new Idp();
var syncClient = new SyncClient({ url: audience });

mockIdp.createUser({
    email: email,
    certDuration: expiresAt
  })
  .then(function(user) {
    return user.getAssertion(audience, expiresAt);
  })
  .then(function(assertion) {
    return syncClient.auth(assertion);
  })
  .then(function(info) {
    return syncClient.request('/info/collections');
  })
  .done(function(results) {
    console.log('results: ', results);
  });
