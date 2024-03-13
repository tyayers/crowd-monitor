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
const { GoogleAuth } = require('google-auth-library');

dotenv.config();

// defining the Express app
const app = express();
// adding Helmet to enhance your API's security
app.use(helmet());
// using bodyParser to parse JSON bodies into JS objects
app.use(bodyParser({ limit: '50mb' }));

// enabling CORS for all requests
app.use(cors());
// adding morgan to log HTTP requests
app.use(morgan('combined'));
app.use(compression());

// SSE
const SSE = require('express-sse');
const sse = new SSE();

var lastAlerts = {};

// Static test page
app.use('/apps', express.static('public'));

// REST methods
app.get('/transport/alerts/stream', (req, res) => {
  sse.init(req, res);
  for (const [key, value] of Object.entries(lastAlerts)) {
    if (value)
      sse.send(value);
  }
});

app.post('/transport/alerts', (req, res) => {
  console.log(`Received alert post request ${JSON.stringify(req.body)}`);
  req.body.timestamp = new Date().toISOString();
  lastAlerts[req.body.checkpointId] = req.body;
  sse.send(req.body);
  res.send("Alert received.");
});

app.post('/vision', (req, res) => {
  console.log("hello");
  const auth = new GoogleAuth();
  auth.getClient("https://vision.googleapis.com/v1p4beta1/images:annotate").then(function (client) {
    client.request({
      url: "https://vision.googleapis.com/v1p4beta1/images:annotate",
      method: "POST",
      data: req.body
    }).then(function (response) {
      // handle success
      console.log(response);
      res.send(response.data);
    }).catch(function (error) {
      console.log(error);
    });
  });
});

app.get('/', (req, res) => {
  res.redirect('/apps');
});

app.get('/health', (req, res) => {
  res.send("Service is healthy.");
});

app.get('/parameters', (req, res) => {
  var result = {
    checkpointId: "",
    baseServiceUrl: ""
  }

  if (process.env.checkpointId) result.checkpointId = process.env.checkpointId;
  if (process.env.baseServiceUrl) result.baseServiceUrl = process.env.baseServiceUrl;

  res.send(result);
});

var port = process.env.PORT;
if (!port) port = "8080";

// starting the server
app.listen(port, () => {
  console.log(`listening on port ${port}`);
});