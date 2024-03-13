echo $PROJECT_ID
echo $REGION
echo $NAME

echo "Creating docker registry, if needed..."
gcloud artifacts repositories create docker-registry --repository-format=docker \
--location="$REGION" --description="Docker registry" 2>/dev/null

echo "Building service..."
gcloud builds submit --config=cloudbuild.yaml \
  --substitutions=_LOCATION="$REGION",_REPOSITORY="docker-registry",_IMAGE="$NAME" .

echo "Deploying service..."
gcloud run deploy $NAME --image $REGION-docker.pkg.dev/$PROJECT_ID/docker-registry/$NAME --platform managed --project $PROJECT_ID --region $REGION --allow-unauthenticated