# elastic-app-functions

### Elastic App-Search schema change requirement

In order for elastic-app-functions to work with an App-Search instanse, some changes to the schema have to be done manually. You may use either ```curl``` or Postman to send a POST request. Below is an example using ```curl```. Please replace ```ENGINE_NAME``` and a ```PRIVATE_KEY``` with appropriate values:
```
curl -X POST 'https://helsinki-production.ent.europe-north1.gcp.elastic-cloud.com/api/as/v1/engines/ENGINE_NAME/schema' \
-H 'Content-Type: application/json' \
-H 'Authorization: Bearer PRIVATE_KEY' \
-d '{
  "publish_date": "date", "meta_content_category": "text"
}
'
```
