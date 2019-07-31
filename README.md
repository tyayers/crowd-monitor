# Digital Airport
This is a demo of digital airport APIs, services, and applications to greatly improve customer experience and efficiency.  Built using Google Cloud, Firebase, and Apigee.  Basically the flow is that a camera monitors the security area of an airport, recognizes congestion and long queues using the Google Vision API / Google AutoML Vision, and if high queues are recognized sends an alert to an airline app to show the alert on the customer's boarding card, and also broadcast a notifcation.

## Components
![Digital Airport Security Dashboard](/img/airport-security-app.png=350x)
[Digital Airport Security App](https://airport-security.web.app)
This app monitors security camera footage for crowds build-up, and in case a crowd is recognized through the *security/vision* API, then accordingly sent to the *security/checkpoint/id/status* API.

![Developer Portal](/img/dev-portal.png=350x)
[Digital Airport Developer Portal](https://tyayers-eval-airportdeveloperportal.apigee.io/)
The Digital Airport Developer Portal serves as integration hub for all apps & services, and includes the security checkpoint API documentation.

![Airline app](/img/airline-app.png=350x)
[Airline Customer App](https://airport-security.web.app/airline-app.html)
The Airline Customer App is a sample app of how the security checkpoint API could be integrated by an airline to provide live, real-time queue updates directly on the boarding app, as well as notifications to make sure the traveller gets to the airport on time.

## Architecture
 ![Digital Airport solution architecture overview](/img/digital-airport-architecture.png)

## Deployment
1. Create a Firebase project at firebase.google.com
2. Clone this repository, install the Firebase Tools and call 'firebase init' in the root directory to link to your firebase project.
3. Set a firebase environment variable with your Google Cloud Vision key with the name VISIONKEY
4. (Optional) - if you want to use Google AutoML Vision, create a file 'privatekey.json' with your Goole Service Identity to be used to call AutoML with.
5. Test by calling 'firebase serve' to host locally and test.  Even if you don't have the keys above set, you can still test in 'Demo Mode' with test data locally in the app. 
6. Have fun, and let me know if you have any questions or comments!

*Coming Soon: apigee proxy configuraiton also here in the repository.*