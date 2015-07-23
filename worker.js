
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

var tg_url = 'https://api.telegram.org/bot' + process.env.TELEGRAM_BOT_KEY + '/sendMessage';
var regex = new RegExp(process.env.TRIGGER_TEXT, 'i');
var laws_regex = new RegExp(process.env.LAWS_REGX, 'i');
var search_regex = new RegExp(process.env.SEARCH_REGX, 'i');
var lastword_regex = new RegExp('(.*)[\s]*(.*)$');

redis_queue.on('message', function(ch, u) {

  //
  // how the update looks when it comes from a person
  //
  // {"update_id":38664384,"message":{"message_id":16,"from":{"id":346904,"first_name":"Andres","last_name":"Villarroel Acosta","username":"andresvia"},"chat":{"id":346904,"first_name":"Andres","last_name":"Villarroel Acosta","username":"andresvia"},"date":1435302373,"text":"yo!"}}
  //
  // how the update looks when it comes from a group
  //
  // {"update_id":38665301,"message":{"message_id":1003,"from":{"id":346904,"first_name":"Andres","last_name":"Villarroel Acosta","username":"andresvia"},"chat":{"id":-29158603,"title":"ale & andres"},"date":1436849868,"text":"perro"}}
  //
  // these are the fields on the msgtable
  //
  // `msgchannel` BIGINT NOT NULL,
  // `msgstart` datetime NOT NULL,
  // `msgmsg` text NOT NULL,
  // `msgat` datetime NOT NULL
  //

  var update = JSON.parse(u);
  var redis_key = "msgmsg" + update.message.chat.id;

  if (update.message.text.match(regex)) {
    var form = {
      chat_id: update.message.chat.id,
      reply_to_message_id: update.message.message_id
    }
    var form_text;
    if (update.message.text.match(laws_regex)) {
      insert_into_db(update, redis_key);
      form_text = process.env.BOT_LAWS;
    } else if (update.message.text.match(search_regex)) {
      var match = update.message.text.match(search_regex);
      var search_text = match[match.length-1]
      console.log(search_text.match(lastword_regex));
      if (search_text != "") {
        form_text = search_text;
      } else {
        form_text = process.env.BOT_SAY + "?";
      }
    } else {
      insert_into_db(update, redis_key);
      form_text = process.env.BOT_SAY + "!";
    }
    form.text = form_text;
    var options = {
      url: tg_url,
      method: 'POST',
      form: form
    }
    request(options);
  } else {
    insert_into_db(update, redis_key);
  }

});

redis_queue.subscribe(process.env.BOT_NAME);

// functions

var insert_into_db = function(update, redis_key) {
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
};

