
var redis = require('redis');
var URI = require('uri-js');
var request = require('request');
var mysql = require('mysql');

// REDIS_URL => redis://h:password@host:port"

var redis_uri = URI.parse(process.env.REDIS_URL);
var extra_params = "&connectionLimit=" + process.env.CLEARDB_DATABASE_CONNECTION_LIMIT;
var mypool = mysql.createPool(process.env.CLEARDB_DATABASE_URL + extra_params);

var redis_queue = redis.createClient(redis_uri.port, redis_uri.host);
redis_queue.auth(redis_uri.userinfo.split(':')[1]);

var redis_client = redis.createClient(redis_uri.port, redis_uri.host);
redis_client.auth(redis_uri.userinfo.split(':')[1]);

var insert_sql = "INSERT INTO msgtable (msgchannel,msgstart,msgmsg,msgat) VALUES (?,?,?,FROM_UNIXTIME(?)) ON DUPLICATE KEY UPDATE msgmsg = CONCAT(msgmsg, '\n', ?)";

redis_queue.on('message', function(ch, u) {
  // person
  // {"update_id":38664384,"message":{"message_id":16,"from":{"id":346904,"first_name":"Andres","last_name":"Villarroel Acosta","username":"andresvia"},"chat":{"id":346904,"first_name":"Andres","last_name":"Villarroel Acosta","username":"andresvia"},"date":1435302373,"text":"yo!"}}
  // group
  // {"update_id":38665301,"message":{"message_id":1003,"from":{"id":346904,"first_name":"Andres","last_name":"Villarroel Acosta","username":"andresvia"},"chat":{"id":-29158603,"title":"ale & andres"},"date":1436849868,"text":"perro"}}
  // `msgchannel` BIGINT NOT NULL,
  // `msgstart` datetime NOT NULL,
  // `msgmsg` text NOT NULL,
  // `msgat` datetime NOT NULL

  var update = JSON.parse(u);
  var redis_key = "msgmsg" + update.message.chat.id;
  var insertmsg = function(message_date) {
    return function(err, conn) {
    if (err) throw err;
      var username = update.message.from.username || update.message.from.first_name ||  update.message.from.last_name || update.message.from.id;
      var msgmsg = username + ": " + update.message.text;
      var inserts = [update.message.chat.id, message_date, msgmsg, update.message.date, msgmsg];
      conn.query(conn.format(insert_sql, inserts), function(err, result){
        if (err) throw err;
        conn.release();
      });
    };
  };
  redis_client.get(redis_key, function(err,reply){
    if (err) throw err;
    if (reply) {
      mypool.getConnection(insertmsg(reply.toString()));
      redis_client.expire(redis_key, process.env.MSG_TTL);
    } else {
      redis_client.set(redis_key, update.message.date);
      mypool.getConnection(insertmsg(update.message.date));
      redis_client.expire(redis_key, process.env.MSG_TTL);
    }
  });
  var regex = new RegExp(process.env.TRIGGER_TEXT, 'i');
  if (!update.message.text.match(regex)) return;
  var tg_url = 'https://api.telegram.org/bot' + process.env.TELEGRAM_BOT_KEY + '/sendMessage';
  var form = {
    chat_id: update.message.chat.id,
    reply_to_message_id: update.message.message_id
  }
  var form_text;
  laws_regex = new RegExp(process.env.LAWS_REGX, 'i');
  if (update.message.text.match(laws_regex)) {
    form_text = process.env.BOT_LAWS;
  } else {
    form_text = process.env.BOT_SAY;
  }
  form.text = form_text;
  var options = {
    url: tg_url,
    method: 'POST',
    form: form
  }
  request(options);

});

redis_queue.subscribe(process.env.BOT_NAME);

