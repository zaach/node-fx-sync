var crypto = require('crypto');
var assert = require('assert');
var SyncClient = require('../lib/syncClient')();
var decryptWBO = SyncClient.decryptWBO;

var key, iv, payload;

function encrypt(plaintext, key, iv) {
  iv = iv.slice(0, 16);
  var cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  cipher.setAutoPadding(true);
  var ciphertext = cipher.update(plaintext, 'utf8', 'base64');
  ciphertext += cipher.final('base64');

  console.log('ciphertext', ciphertext, ciphertext.length);

  return ciphertext;
}

function decrypt(ciphertext, key, iv) {
  iv = iv.slice(0, 16);
  console.log('iv', iv, iv.length);

  var decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
  decipher.setAutoPadding(true);

  var plaintext = decipher.update(ciphertext, 'base64', 'utf8')
  plaintext += decipher.final('utf8');

  console.log('plaintext', plaintext);
  return plaintext;
}


// test basic crypto
key = Buffer("0123456789abcdef0123456789abcdef", "utf8");
iv = Buffer("0123456789abcdef", "utf8");
payload = "ThisStringIsExactlyThirtyTwoByte";
assert.equal(payload, decrypt(encrypt(payload, key, iv), key, iv));

expectedCiphertext = Buffer("26fc3a9c95765336123dedcbebcc0c3f652cc4473c6c6f0dfe27c1d4cf04c3ae32bea9f6e1940a15f446f4cbf516141f", "hex");

assert.equal(expectedCiphertext.length, 48);
assert.equal(encrypt("ThisStringIsExactlyThirtyTwoByte", key, iv), "Jvw6nJV2UzYSPe3L68wMP2UsxEc8bG8N/ifB1M8Ew64yvqn24ZQKFfRG9Mv1FhQf");


// test key derivation
var keyBundle = {
   encKey: Buffer("M2WxH2kvEDlRW3kgPV9KMbI047UPzdVj9X2WSNcaqME=", "base64"),
   hmacKey: Buffer("Cxbz9pbZ6RMkyeUXu9Uo4ZTebzp34yjY38/Z14ORSaM=", "base64")
};

var derivedKeys = SyncClient.prototype._deriveKeys.call({}, Buffer("a5653a34302125fd0a72619dbcc2cfada1b51d597c9d47995ed127daffcbf6a3", "hex"))
  .then(function (bundle) {
    assert.equal(bundle.encKey, keyBundle.encKey);
    assert.equal(bundle.hmackey, keyBundle.hmackey);
  });

// test wbo decrypt
var wbo = { payload: '{"ciphertext":"PoI050UwrZvi0o4d/A5ceRQoWfangl8Z3xX81hnkun/6WmHpqx1/bos5LI12OYBfd1FNecjF21bZ8q5D/LB0gKNtpUmAgDcxwe6cyc2BLuqWdQuh/FzRzOt/HVayKFckJ0nrH10zRaR1QhZZRCyKMVjsbdWkUip4NQ/spXdiHc5hgj51oMRujvrJX6YK1bejgvIHx85fvLmt5lKiIAuRhw==","IV":"CIV2kzCWf/aMc5ACcozreQ==","hmac":"c2cca14183dfbd2f345cde850e5450ca4921486f042374de93ce36da3939a73f"}',
  id: 'keys',
  modified: 1383878611.77 };

var result = decryptWBO(keyBundle, wbo);
assert.ok(result.default);

// client state

function hash (bytes) {
  var sha = crypto.createHash('sha256');
  return sha.update(bytes).digest();
}

var kb = '6b813696a1f83a87e41506b7f33b991b985f3d6e0c934f867544e711882c179c';
var state = '630b070cdd4369880a82762436c5399d';

assert.equal(hash(Buffer(kb, 'hex')).slice(0, 16).toString('hex'), state);
