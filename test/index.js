const Idp = require('../idp');
const SyncClient = require('../sync');

const duration = 3600 * 24 * 365;
const audience = 'http://auth.oldsync.dev.lcip.org';
const email = 'tester@mockmyid.com';

const mockIdp = new Idp();
var syncClient = new SyncClient({ url: audience });

mockIdp.getAssertion({
  email: email,
  certDuration: duration,
  audience: audience,
  assertionDuration: duration
})
.then(function(assertion) {
  console.log(assertion);
  return syncClient.auth(assertion);
})
.then(function(info) {
  console.log(info);
  return syncClient.request('/info/collections');
})
.done(function(results) {
  console.log('results: ', results);
});
