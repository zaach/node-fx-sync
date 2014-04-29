const assert = require('assert');
const Sync = require('../sync')();

var creds;

try {
  creds = require('./creds.json');
} catch (e) {
  throw new Error('Create a new Sync account in Firefox >=29 and put your credentials in test/creds.json');
}

var sync = new Sync(creds);

sync.fetch('tabs')
.then(function(results) {
  console.log('tabs: ', results);
  assert.ok(results);
})
.then(function() {
  return sync.fetch('bookmarks');
})
.then(function(results) {
  console.log('bookmarks: ', results);
  assert.ok(results);
})
.then(function() {
  syncToo = new Sync({ authState: sync.authState });
  return syncToo.fetch('bookmarks');
})
.then(function(results) {
  console.log('bookmarks too: ', results);
  assert.ok(results);
})
.done();
