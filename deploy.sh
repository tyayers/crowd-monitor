export name=publicspaces

cd service
gcloud builds submit --tag eu.gcr.io/$1/$name
gcloud run deploy $name --image eu.gcr.io/$1/$name --platform managed --project $1 --region europe-west3 --allow-unauthenticated