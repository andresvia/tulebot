
var redis = require('redis');
var URI = require('uri-js');
var request = require('request');

// REDIS_URL => redis://h:password@host:port"

var redis_uri = URI.parse(process.env.REDIS_URL);

var redis_client = redis.createClient(redis_uri.port, redis_uri.host)
redis_client.auth(redis_uri.userinfo.split(':')[1])


redis_client.on('message', function(ch, u) {
  // {"update_id":38664384,"message":{"message_id":16,"from":{"id":346904,"first_name":"Andres","last_name":"Villarroel Acosta","username":"andresvia"},"chat":{"id":346904,"first_name":"Andres","last_name":"Villarroel Acosta","username":"andresvia"},"date":1435302373,"text":"yo!"}}

  var update = JSON.parse(u);
  if (!update.message) return;
  if (!update.message.text) return;
  var regex = new RegExp(process.env.TRIGGER_TEXT, 'i');
  if (!update.message.text.match(regex)) return;
  var tg_url = 'https://api.telegram.org/bot' + process.env.TELEGRAM_BOT_KEY + '/sendMessage';
  var body = {
    chat_id: update.message.chat.id,
    text: process.env.BOT_SAY,
    reply_to_message_id: update.message.message_id
  }
  var options = {
    url: tg_url,
    method: 'POST',
    json: true,
    body: body
   }
  request.request(options);

});

redis_client.subscribe(process.env.BOT_NAME);

