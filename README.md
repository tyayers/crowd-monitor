# Google Cloud & Apigee Digital Transport Hub Solution
Transportation hubs are in more need of digital solutions now than ever, and with the right cloud & data services connected in innovative ways can deliver next-level service and functionality in a highly competitive travel market.

This solution demonstrates a best-practice solution for leveraging Google Cloud services to be the digital hub for all services, APIs and data integration in a transport hub facilities environment.

| Purpose   | Service   | Description   |
| ---       | ---       | ---           |
| API integration / consumption   | **Apigee API Management** | APIs are the backbone for real-time communication, synchronization & integration between systems, services & apps / clients / ecosystems
| Web / app hosting | **Firebase / Google Cloud Run / SignalPattern** | Fast and simple serverless hosting of mobile & web clients & services
| Additional UI / Kiosk hosting | **SignalPattern** | Powerful and easy user interface and interaction points
| Real-Time Monitoring / Operations Data | **Google Cloud Monitor** | Unified monitoring of all metrics & events
| AI / ML Services  | **Google AI Services**  | Real-time analysis of image, video and text data
| AI / ML Analytics | **Google Cloud BigQuery** | Cloud data warehouse for analytics and AI/ML predictions 

## Deploy
You can easily deploy this solution in your GCP project by clicking this button:

[![Run on Google Cloud](https://deploy.cloud.run/button.svg)](https://deploy.cloud.run?dir=services/transport-service)

## Live Deployments

These deployments can be tested in a sandbox environment to see how the functionalities work 

* [Transport API Hub](https://emea-poc13-kaleotransport.apigee.io/) - this is the integration point for all apps & services
* [Transport Manager App](https://transport-service-h7pi7igbcq-ey.a.run.app/apps/transport-manager/) - Live analytics of security / kiosk checkpoint data
* [Example Airline App](https://transport-service-h7pi7igbcq-ey.a.run.app/apps/passenger-app/) - Delivers live real-time updates of congestion / other warnings directly to passengers
* [Traveller Interaction Kiosk](https://www.signalpattern.com/patterns/apigee/airport) - Real-time customer satisfaction & survey input

## Feedback

Feel free to add an issue / feature request.
