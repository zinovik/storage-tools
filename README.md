# storage-tools

### create service account

```bash
gcloud iam service-accounts create storage-tools
```

### add access to secrets, bucket and cloud run invoking

```
gcloud storage buckets add-iam-policy-binding gs://zinovik-gallery --member="serviceAccount:storage-tools@zinovik-project.iam.gserviceaccount.com" --role="roles/storage.admin"

gcloud storage buckets add-iam-policy-binding gs://hedgehogs --member="serviceAccount:storage-tools@zinovik-project.iam.gserviceaccount.com" --role="roles/storage.admin"

gcloud storage buckets add-iam-policy-binding gs://digital-board-games --member="serviceAccount:storage-tools@zinovik-project.iam.gserviceaccount.com" --role="roles/storage.admin"

gcloud projects add-iam-policy-binding zinovik-project --member="serviceAccount:gallery@zinovik-project.iam.gserviceaccount.com" --role="roles/run.invoker"
```

### creating keys for service account for github-actions `GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY_FILE`

```bash
gcloud iam service-accounts keys create key-file.json --iam-account=storage-tools@zinovik-project.iam.gserviceaccount.com
cat key-file.json | base64
```
