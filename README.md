# Digital Airport
This is a demo of digital airport APIs, services, and applications to greatly improve customer experience and efficiency.  Built using Google Cloud, Firebase, and Apigee.  Basically the flow is that a camera monitors the security area of an airport, recognizes congestion and long queues using the Google Vision API / Google AutoML Vision, and if high queues are recognized sends an alert to an airline app to show the alert on the customer's boarding card, and also broadcast a notifcation.

![Digital Airport Security Dashboard](/img/airport-security-app.png)
![Developer Portal](/img/dev-portal.png)
![Airline app](/img/airline-app.png)

## Architecture
 ![Digital Airport solution architecture overview](/img/digital-airport-architecture.png)

## Deployment
1. Create a Firebase project at firebase.google.com
2. Clone this repository, install the Firebase Tools and call 'firebase init' in the root directory to link to your firebase project.
3. Set a firebase environment variable with your Google Cloud Vision key with the name VISIONKEY
4. (Optional) - if you want to use Google AutoML Vision, create a file 'privatekey.json' with your Goole Service Identity to be used to call AutoML with.
5. Test by calling 'firebase serve' to host locally and test.  Even if you don't have the keys above set, you can still test in 'Demo Mode' with test data locally in the app. 
6. Have fun, and let me know if you have any questions or comments!