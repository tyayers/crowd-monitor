NAME=publicspaces
PROJECT=$(gcloud config get project)

cd service
gcloud builds submit --tag gcr.io/$PROJECT/$NAME
gcloud run deploy $NAME --image gcr.io/$PROJECT/$NAME --platform managed --project $PROJECT --region europe-west1 --allow-unauthenticated