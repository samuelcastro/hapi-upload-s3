var handler = require('./handler');
var AWS = require('aws-sdk');
var datefmt = require('datefmt');
var Hoek = require('hoek');
var slug = require('slug');

// Forces slug to use url encoding
slug.defaults.mode = 'rfc3986';

module.exports = function(plugin, options, next) {

  options = options || {};

  var endpoint = options.endpoint || '/upload';

  options.contentTypes = options.contentTypes || [];

  /**
   * Note that if you do not specify a protocol, the protocol will
   * be selected based on your current {AWS.config} configuration.
   * @type {AWS.Endpoint}
   * @moreInfo http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Endpoint.html
   */
  var ep = new AWS.Endpoint(options.s3Endpoint);

  var s3 = new AWS.S3({
    accessKeyId: options.s3AccessKey,
    secretAccessKey: options.s3SecretAccessKey,
    region: options.s3Region,
    endpoint: ep
  });

  var getFileKey = function(filename) {
    filename = slug(filename);
    var fileKey = datefmt('%Y-%m-%d', new Date()) + '/' + (+new Date) + '/' + filename;
    return fileKey;
  };

  var getS3Url = function(fileKey) {
    const host = options.s3Endpoint || 's3.amazonaws.com';
    var s3UrlBase = 'https://' + options.s3Bucket + '.' + host + '/';
    return s3UrlBase + fileKey;
  };

  plugin.bind({
    options: options,
    s3: s3,
    bucketName: options.s3Bucket,
    Hapi: plugin.hapi,
    getFileKey: options.getFileKey || getFileKey,
    getS3Url: options.getS3Url || getS3Url
  });

  var maxBytes = {
    payload: {
      maxBytes: options.maxBytes || 1048576 // Hapi default (1MB)
    }
  };

  plugin.route([
    { path: endpoint, method: 'POST', config: Hoek.applyToDefaults(handler.upload, maxBytes) },
    { path: endpoint + '/image/{type}/{width}/{height}', method: 'POST', config: Hoek.applyToDefaults(handler.image, maxBytes) }
  ]);
  next();
};

module.exports.attributes = {
  name: 'hapi-upload-s3',
  pkg: require('../package.json')
};
