# node-fx-sync

Create a new Firefox Account in Firefox 29 or newer and you'll be able to use this module to download your Sync data. Fancy!

## Install

    npm install fx-sync

## Example

```
var FxSync = require('fx-sync');

var sync = new FxSync({ email: 'me@example.com', password: 'hunter2' });

// Download and print my super useful bookmarks

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
```

## API

### `sync = new FxSync({ email: <email>, password: <password> })`

Creates a new instance.

### `sync.fetch(collection)`

E.g. `sync.fetch('tabs').then(function (result) { ... });`

Fetch sync'ed data from `collection`. Useful `collection`s include: `passwords`, `tabs`, `forms`, `prefs`, `bookmarks`, `addons`, and `history`.

## License

Apache License 2.0
