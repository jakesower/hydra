const http = require('http');
const config = require('./config.json');

const port = config.port;
const server = http.createServer((req, res) => {
  res.write(JSON.stringify(req.headers));
  res.end();
});

server.listen(port);

