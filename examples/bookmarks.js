const FxSync = require('../');

var credentials;

try {
  credentials = require('./creds.json');
} catch (e) {
  throw new Error('Create a new Sync account in Firefox >=29 and put your credentials in test/creds.json');
}

var sync = new FxSync(credentials);

sync.fetch('bookmarks')
  .then(function(results) {
    results
      .filter(filterBookmark)
      .map(mapBookmark)
      .forEach(renderBookmark);
  })
  .done();

function filterBookmark(bookmark) {
  return bookmark.type === 'bookmark';
}

function mapBookmark(bookmark) {
  return {
    title: bookmark.title,
    url: bookmark.bmkUri,
    description: bookmark.description || '',
    tags: bookmark.tags
  };
}

function renderBookmark(bookmark) {
  console.log(bookmark);
}
