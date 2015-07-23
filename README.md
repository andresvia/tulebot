# mytgbot

My single purpose [Telegram bot](https://core.telegram.org/bots).

Node.js app that uses [Express](http://expressjs.com/) to receive [WebHooks](https://core.telegram.org/bots/api#setwebhook) from Telegram.

`index.js` is a simple endpoint that just queue every request into a [Redis](http://redis.io/) _pubsub_.

`worker.js` do the real "work", pulls messages from Redis and using simple hardcoded rules ACK to the person or group in Telegram using the bot API.

## Running

### Requisites

- [Node.js](http://nodejs.org/)
- [Redis](http://redis.io/)
- [MySQL](https://dev.mysql.com/)

### Environment variables

All listed environment variables are _required_, missing one of them will crash the application.

- `BOT_KEY`          - This bot will accept _only_ `POST` requests on `server:port/BOT_KEY` any attempt to send request using other HTTP methods or paths will result in a `40X` error.
- `BOT_LAWS`         - Text that will be used when the "laws" command is triggered.
- `BOT_NAME`         - Will be used as the name of the Redis _pubsub_ queue, many bots may share the same Redis instance.
- `BOT_SAY`          - Word or phrase that the bot uses to ACK user messages, sometimes the bot may suffix this string with '?' or '!' characters.
- `DATABASE_URL`     - URI to connect to MySQL like `mysql://user:pass@host/db?param1=val1...` will be used by [node MySQL driver](https://www.npmjs.com/package/mysql).
- `LAWS_REGX`        - Regular expression that is used to display this bot laws.
- `MSG_TTL`          - For this bot history keeping function, a time window longer than `MSG_TTL` seconds without messages ends the current message stream.
- `REDIS_URL`        - URI to connect to Redis resource like `redis://h:pass@host:port` this is passed to the [node Redis client](https://www.npmjs.com/package/redis).
- `SEARCH_REGX`      - For this bot history keeping function, this regular expression will be used as the trigger word to start a full text search on MySQL.
- `TELEGRAM_BOT_KEY` - This is the secret bot key that Telegram's [BotFather](http://telegram.me/BotFather) provides, is a string like `#######:AAAAAAAAAAAAAA`.
- `TRIGGER_TEXT`     - This is the trigger word that the bot uses to responds to other commands, if no other command is found the bot will just ACK with `BOT_SAY`.

## Deploy

Configure the Telegram bot to receive updates using WebHooks.

`curl https://api.telegram.org/botYOUR_TELEGRAM_BOT_KEY/setWebhook\?url\=https://your_endpoint/YOUR_BOT_KEY`

For best usability on groups set bot group privacy to 'DISABLED'.

## Privacy

Best effort is done to avoid revealing information of groups or people. But no guaranties are provided.

## Online implementation

A Heroku dyno running with my own environment variables is available at: [@zagabot](http://telegram.me/zagabot). You are encouraged to run your own bot, with your own set of rules.

