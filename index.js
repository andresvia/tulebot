
var express = require('express');
var bodyParser = require('body-parser');
var URI = require('uri-js');
var redis = require('redis');
var app = express();

// REDIS_URL => redis://h:password@host:port"

var redis_uri = URI.parse(process.env.REDIS_URL);

// redis_uri => { scheme: 'redis',
//  userinfo: 'h:password',
//  host: 'host',
//  port: 6759,
//  path: '',
//  query: undefined,
//  fragment: undefined,
//  reference: 'absolute' }

var redis_client = redis.createClient(redis_uri.port, redis_uri.host)
redis_client.auth(redis_uri.userinfo.split(':')[1])

app.set('port', (process.env.PORT || 5000));
app.set('trust proxy', true);
app.use(bodyParser.json());

app.post('/' + process.env.BOT_KEY, function(req, res) {
  redis_client.publish(process.env.BOT_NAME, JSON.stringify(req.body));
  res.send();
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
