const firebase = require('firebase');
const firestore = require("firebase/firestore");
const admin = require('firebase-admin');
const request = require('request');
const rp = require('request-promise');
const rs = require('jsrsasign')
const privatekey = require("./privatekey.json");

//admin.initializeApp(functions.config().firebase);

const express = require('express');
const cors = require('cors');
const app = express();

// Load environment variables
require('dotenv').config();

// Initialize Cloud Firestore through Firebase
firebase.initializeApp({
    apiKey: process.env.FBKEY,
    authDomain: process.env.FBDOMAIN,
    projectId: process.env.FBPROJECT
  });

// Automatically allow cross-origin requests
app.use(cors({ origin: true }));
app.use(express.json({limit: '50mb'}));

// The vision method takes requests in the cloudvision format, and depending on
// the "engine" url parameter (either "cloudvision" or "amlvision") routes and 
// maps to either the cloudvision or amlvision services (client only needs to know 1 api)
app.post('/security/vision', (req, res) => {

  if (req.query.engine == "amlvision") {
    // We have to map the request/response from cloudvision to amlvision format..
    var amlrequest = {
      payload: {
        image: {
          imageBytes: req.body.requests[0].image.content
        }
      }
    };

    callAmlVision(amlrequest).then(function(response) {
      var respObj = JSON.parse(response);
      var mappedResponse = {
        responses: [
          {
            labelAnnotations: [
              {
                description: respObj.payload[0].displayName,
                score: respObj.payload[0].classification.score,
                topicality: respObj.payload[0].classification.score
              }
            ]
          }
        ]
      };

      if (mappedResponse.responses[0].labelAnnotations[0].description == "high") {
        // Add a crowd entry to signal this means a crowd is there
        mappedResponse.responses[0].labelAnnotations.push(
          {
            description: "crowd",
            score: mappedResponse.responses[0].labelAnnotations[0].score,
            topicality: mappedResponse.responses[0].labelAnnotations[0].score            
          }
        );
      }

      res.end(JSON.stringify(mappedResponse));
    }, function(error) {
      res.end(error);
    });
  }
  else {
    // Since we use the cloudvision API format, we just send it through..
    callCloudVision(req.body).then(function(response) {
      res.end(response);
    }, function(error) {
      res.end(error);
    });
  }
});

// cloudvision calls the Google CLoud Vision API directly with no mapping
app.post('/security/cloudvision', (req, res) => {

  callCloudVision(req.body).then(function(response) {
    res.end(response);
  }, function(error) {
    res.end(JSON.stringify(error));
  });
});

// amlvision calls the Google AutoML Vision API directly with no mapping
app.post('/security/amlvision', (req, res) => {

  callAmlVision(req.body).then(function(response) {
    res.end(response);
  }, function(error) {
    res.end(error);
  });
});

app.put('/security/checkpoint/:checkpointId/status/:queueStatus', (req, res) => {
  const checkpointId = req.params.checkpointId;
  const queueStatus = req.params.queueStatus;
  var result = {
    result: "unknown"
  }
  console.log("received request for " + checkpointId + " and status " + queueStatus);

  console.log("opening firestore");

  var db = firebase.firestore();
  
  console.log("writing new status");
  
  db.collection("security").doc(checkpointId).set({
    status: queueStatus
  })
  .catch(function(error) {
    console.error("Error writing document: ", error);
    result.result = "Error writing document: " + error;
  });		

  result.result = "Status updated.";

  console.log("finished writing status");

  res.end(JSON.stringify(result));
});

app.get('/security/checkpoint/:checkpointId/status', (req, res) => {
  const cId = req.params.checkpointId;

  var result = { 
    checkpointId: cId,
    status: "unknown"  
  };

  var db = firebase.firestore();
  db.collection("security").doc(cId).get().then(function(doc) {
    if (doc.exists) {
      result.status = doc.data().status;
      res.end(JSON.stringify(result));
    }
    else {
      result.error = "checkpoint " + cId + " not found!";
      res.end(JSON.stringify(result));
    }
  })
  .catch(function(error) {
    result.error = error;
    console.error("Error reading document: ", error);
    res.end(JSON.stringify(result));
  });		
});

// callCloudVision calls the Google Cloud Vision API using the request-promise library
function callCloudVision(req) {
  return new Promise(function(resolve, reject) {
    
    console.log(process.env.VISIONKEY);
    var options = {
      method: 'POST',
      uri: 'https://vision.googleapis.com/v1/images:annotate?key=' + process.env.VISIONKEY,
      body: JSON.stringify(req),
      json: false // Automatically stringifies the body to JSON
    };

    rp(options)
    .then(function (body) {
        console.log(body);
        resolve(body);
    })
    .catch(function (err) {
      reject(err);
    });
  });
}

// callAmlVision calls the Google AutoML Vision API using the request-promise library
function callAmlVision(req) {
  return new Promise(function(resolve, reject) {

    getGoogleToken().then(function(token) {
      var options = {
        method: 'POST',
        uri: 'https://automl.googleapis.com/v1beta1/projects/tyler-airport/locations/us-central1/models/ICN8703146076778665721:predict',
        headers: {
          'content-type' : 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify(req),
        json: false 
      };
  
      rp(options)
      .then(function (parsedBody) {
        resolve(parsedBody);
      })
      .catch(function (err) {
        reject(err);
      });
    }, function(err) {
      reject(err);
    });
  });
}

// getGoogleToken gets the Google API OAuth 2 token for the cloud-platform scope using a privatekey (service-to-service)
function getGoogleToken() {
  return new Promise(function(resolve, reject) {

    var pHeader = {"alg":"RS256","typ":"JWT"}
    var sHeader = JSON.stringify(pHeader);
  
    var pClaim = {};
    pClaim.aud = "https://www.googleapis.com/oauth2/v3/token";
    pClaim.scope = "https://www.googleapis.com/auth/cloud-platform";
    pClaim.iss = privatekey.client_email;
    pClaim.exp = rs.jws.IntDate.get("now + 1hour");
    pClaim.iat = rs.jws.IntDate.get("now");
  
    var sClaim = JSON.stringify(pClaim);
    var sJWS = rs.jws.JWS.sign(null, sHeader, sClaim, privatekey.private_key);
  
    var urlEncodedData = "";
    var urlEncodedDataPairs = [];
    
    urlEncodedDataPairs.push(encodeURIComponent("grant_type") + '=' + encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer"));
    urlEncodedDataPairs.push(encodeURIComponent("assertion") + '=' + encodeURIComponent(sJWS));
    urlEncodedData = urlEncodedDataPairs.join('&').replace(/%20/g, '+');

    var options = {
      method: 'POST',
      uri: 'https://www.googleapis.com/oauth2/v3/token',
      headers: {
        'content-type' : 'application/x-www-form-urlencoded'
      },
      body: urlEncodedData,
      json: false // Automatically stringifies the body to JSON
    };

    rp(options)
    .then(function (parsedBody) {
      var auth = JSON.parse(parsedBody);
      var token = auth["access_token"];
      resolve(token);
    })
    .catch(function (err) {
      reject(err);
    });
  });
}

app.listen(8080, () => console.log(`Airport security listening on port 8080!`))