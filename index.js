var express = require('express');
var bodyParser = require('body-parser');
var app = express();

app.set('port', (process.env.PORT || 5000));
app.set('trust proxy', true);
app.use(bodyParser.json());

app.all('*', function(req, res) {
  console.log(req.body);
  res.send();
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
