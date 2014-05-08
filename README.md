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

#### `sync = new FxSync({ email: <email>, password: <password> })`

Creates a new instance.

#### `sync.fetch(collection, options)`

E.g. `sync.fetch('tabs').then(function (result) { ... });`

Fetch sync'ed data from `collection`. Useful `collection`s include: `passwords`, `tabs`, `forms`, `prefs`, `bookmarks`, `addons`, and `history`. For information on `options`, [look here](https://docs.services.mozilla.com/storage/apis-1.5.html#individual-collection-interaction).

#### `sync.fetchIDs(collection, options)`

E.g. `sync.fetchIDs('history', { limit: 50 }).then(function (result) { ... });`

Fetch the IDs of objects in `collection`. You can use this to build more complicated queries without downloading the full contents of each object in the query. For information on `options`, [look here](https://docs.services.mozilla.com/storage/apis-1.5.html#individual-collection-interaction).


## License

Apache License 2.0
