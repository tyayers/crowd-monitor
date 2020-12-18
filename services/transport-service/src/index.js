const compression = require('compression');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require("fs");
const axios = require('axios').default;
const https = require('https');

const dotenv = require('dotenv');
dotenv.config();

// defining the Express app
const app = express();
// adding Helmet to enhance your API's security
app.use(helmet());
// using bodyParser to parse JSON bodies into JS objects
app.use(bodyParser.json());
// enabling CORS for all requests
app.use(cors());
// adding morgan to log HTTP requests
app.use(morgan('combined'));
app.use(compression());

// SSE
const SSE = require('express-sse');
const sse = new SSE();

// Static test page
app.use('/apps', express.static('public'));

// REST methods
app.get('/transport/alerts/stream', sse.init);

app.post('/transport/alerts', (req, res) => {
  console.log(`Received alert post request ${JSON.stringify(req.body)}`);
  req.body.timestamp = new Date().toISOString();
  sse.send(req.body);
  res.send("Alert received.");
});

app.get('/', (req, res) => {
  res.send("Service is healthy.");
});

app.get('/health', (req, res) => {
  res.send("Service is healthy.");
});

app.get('/parameters', (req, res) => {
  res.send('{ "checkpointId": "' + process.env.checkpointId + '", "baseServiceUrl": "' + process.env.baseServiceUrl + '" }');
});

var port = process.env.PORT;
if (!port) port = "8080";

// starting the server
app.listen(port, () => {
  console.log(`listening on port ${port}`);
});