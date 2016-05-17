
var redis = require('redis');
var URI = require('uri-js');
var request = require('request');
var mysql = require('mysql');
var DBMigrate = require('db-migrate');
// var dbmigrate = DBMigrate.getInstance(true);
// dbmigrate.run();

// REDIS_URL => redis://h:password@host:port"

var redis_uri = URI.parse(process.env.REDIS_URL);
var database_url = "mysql://" +
  process.env.DB_USER         + ":" +
  process.env.DB_PASSWORD     + "@" +
  process.env.DB_HOST         + "/" +
  process.env.DB_DATABASE     + "?reconnect=true";
var mypool = mysql.createPool(database_url);

var redis_queue = redis.createClient(redis_uri.port, redis_uri.host);
redis_queue.auth(redis_uri.userinfo.split(':')[1]);

var redis_client = redis.createClient(redis_uri.port, redis_uri.host);
redis_client.auth(redis_uri.userinfo.split(':')[1]);

var insert_sql = "INSERT INTO msgtable (msgchannel,msgstart,msgmsg) VALUES (?,?,?) ON DUPLICATE KEY UPDATE msgmsg=CONCAT(msgmsg,'\n',?)";
var select_sql = "SELECT msgchannel,msgstart,msgmsg FROM (SELECT msgchannel,msgstart,msgmsg,msgupdated FROM msgtable WHERE MATCH msgmsg AGAINST (? IN BOOLEAN MODE)) AS fts WHERE msgchannel = ? ORDER BY msgupdated DESC";
var update_sql = "UPDATE msgtable SET msgtimesread=msgtimesread+1 WHERE msgchannel=? AND msgstart=? LIMIT 1";

var tg_url = 'https://api.telegram.org/bot' + process.env.TELEGRAM_BOT_KEY + '/sendMessage';
var regex = new RegExp(process.env.TRIGGER_TEXT, 'i');
var laws_regex = new RegExp(process.env.LAWS_REGX, 'i');
var search_regex = new RegExp(process.env.SEARCH_REGX, 'i');

redis_queue.on('message', function(ch, u) {

  //
  // how the update looks when it comes from a person
  //
  // {"update_id":0,"message":{"message_id":0,"from":{"id":0,"first_name":"F","last_name":"L","username":"u"},"chat":{"id":0,"first_name":"F","last_name":"L","username":"u"},"date":0,"text":"t"}}
  //
  // how the update looks when it comes from a group
  //
  // {"update_id":0,"message":{"message_id":0,"from":{"id":0,"first_name":"F","last_name":"L","username":"u"},"chat":{"id":0,"title":"T"},"date":0,"text":"t"}}
  //
  // these are the fields on the msgtable
  //
  // `msgchannel` BIGINT NOT NULL,
  // `msgstart` datetime NOT NULL,
  // `msgmsg` text NOT NULL,
  // `msgtimesread` BIGINT NOT NULL,
  // `msgupdated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
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
      var search_text = match[match.length-1].split(/\s+/);
      var last = search_text.pop();
      var number = parseInt(last);
      if (!number) { // BUG: also true for '0'
        search_text.push(last);
        number = 1;
      }
      number = Math.abs(number);
      number = number - 1;
      search_text = search_text.join(' ');
      if (search_text != "") {
        mypool.getConnection(function(err, conn){
          if (err) throw err;
	  var fields = [search_text, update.message.chat.id];
	  conn.query(conn.format(select_sql, fields), function(err, rows){
            if (err) throw err;
	    var results = rows.length;
            if (results > number) {
              var row = rows[number];
              var msgstart = new Date(1000 * parseInt(row.msgstart));
	      post_to_tg(update.message.chat.id, update.message.message_id, '<<' + search_text + '>>... ' + results + '\n' + msgstart + '\n' + row.msgmsg);
	      conn.release();
              mypool.getConnection(function(err, conn){
                if (err) throw err;
		conn.query(conn.format(update_sql, [row.msgchannel, row.msgstart]), function(err, result){
                  if (err) throw err;
		});
		conn.release();
              });
	    }
	  });
	});
      } else {
        form_text = process.env.BOT_SAY + "?";
      }
    } else {
      insert_into_db(update, redis_key);
      form_text = process.env.BOT_SAY + "!";
    }
    if (form_text) {
      post_to_tg(update.message.chat.id, update.message.message_id, form_text);
    }
  } else {
    insert_into_db(update, redis_key);
  }

});

redis_queue.subscribe(process.env.BOT_NAME);

// functions

var post_to_tg = function(id, replyto, text){
  var options = {
    url: tg_url,
    method: 'POST',
    form: {
      chat_id: id,
      reply_to_message_id: replyto,
      text: text
    }
  }
  request(options);
};

var insert_into_db = function(update, redis_key) {
  var insertmsg = function(message_date) {
    return function(err, conn) {
      if (err) throw err;
      var username = update.message.from.username || update.message.from.first_name ||  update.message.from.last_name || update.message.from.id;
      var msgmsg = username + ": " + update.message.text;
      var inserts = [update.message.chat.id, message_date, msgmsg, msgmsg];
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

