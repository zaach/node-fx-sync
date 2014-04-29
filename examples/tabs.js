const FxSync = require('../');

var credentials;

try {
  credentials = require('./creds.json');
} catch (e) {
  throw new Error('Create a new Sync account in Firefox >=29 and put your credentials in test/creds.json');
}

var sync = new FxSync(credentials);

sync.fetch('tabs')
  .then(function(results) {
    results
      .map(mapDevice)
      .forEach(renderDevice);
  })
  .done();


function mapTab(tab) {
  return {
    title: tab.title,
    url: tab.urlHistory[0],
    icon: tab.icon,
    lastUsed: tab.lastUsed
  };
}

function mapDevice(device) {
  return {
    device: device.clientName,
    tabs: device.tabs.map(mapTab)
  };
}

function renderDevice(device) {
  console.log(device);
}
