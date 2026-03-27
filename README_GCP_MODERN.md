# Modern Serverless Deployment on GCP (Cloud Run)

This guide explains how to host AI4CARE on Google Cloud Platform without using Virtual Machines (VMs), utilizing modern serverless architecture and CI/CD.

## Architecture Overview
- **Frontend**: Hosted on **Firebase Hosting** (subset of GCP) for global CDN and fast delivery.
- **Backend**: Containerized and deployed to **Google Cloud Run** (scales to zero, fully managed).
- **Database**: Migrated to **Cloud SQL (PostgreSQL)**. (Note: SQLite is not recommended for Cloud Run due to its ephemeral filesystem).
- **CI/CD**: Fully automated via **GitHub Actions** or **Google Cloud Build**.

---

## 1. Cloud Run Deployment (Backend)

Google Cloud Run allows you to run your Node.js backend in a stateless container.

### Step 1: Create a Dockerfile
Create a `Dockerfile` in the root directory:
```dockerfile
FROM node:18-slim
WORKDIR /app
COPY . .
RUN npm install
EXPOSE 3001
CMD ["node", "server/server.js"]
```

### Step 2: Build and Push to Artifact Registry
```bash
# Authenticate
gcloud auth configure-docker us-central1-docker.pkg.dev

# Create repository
gcloud artifacts repositories create ai4care-repo --repository-format=docker --location=us-central1

# Build and push
docker build -t us-central1-docker.pkg.dev/[PROJECT_ID]/ai4care-repo/backend:v1 .
docker push us-central1-docker.pkg.dev/[PROJECT_ID]/ai4care-repo/backend:v1
```

### Step 3: Deploy to Cloud Run
```bash
gcloud run deploy ai4care-backend \
    --image us-central1-docker.pkg.dev/[PROJECT_ID]/ai4care-repo/backend:v1 \
    --platform managed \
    --region us-central1 \
    --allow-unauthenticated
```

---

## 2. Firebase Hosting (Frontend)

Firebase Hosting is the best way to serve your React/Vite builds.

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Initialize
firebase init hosting

# Deploy
npm run build --prefix client
firebase deploy --only hosting
```

---

## 3. Database Migration (Cloud SQL)

Since Cloud Run is stateless, you cannot use a local `ai4care.db` file effectively. You should migrate to **Cloud SQL**.

1.  Create a Cloud SQL (PostgreSQL) instance in the GCP Console.
2.  Update your `server.js` database connection logic to use `pg` instead of `sqlite3` when a `DATABASE_URL` is provided.
3.  Connect the Cloud Run service to the Cloud SQL instance using the Cloud SQL Auth Proxy or Unix sockets.

---

## 4. CI/CD with GitHub Actions

Automate your deployment every time you push to the `main` branch. Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GCP

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Auth GCP
        uses: google-github-actions/auth@v1
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v1

      - name: Build and Push Container
        run: |
          gcloud auth configure-docker us-central1-docker.pkg.dev
          docker build -t us-central1-docker.pkg.dev/${{ secrets.GCP_PROJECT_ID }}/ai4care-repo/backend:${{ github.sha }} .
          docker push us-central1-docker.pkg.dev/${{ secrets.GCP_PROJECT_ID }}/ai4care-repo/backend:${{ github.sha }}

      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy ai4care-backend \
            --image us-central1-docker.pkg.dev/${{ secrets.GCP_PROJECT_ID }}/ai4care-repo/backend:${{ github.sha }} \
            --region us-central1
```

---

## Advantages of this Approach
1.  **Cost Effective**: Cloud Run only charges when requests are being processed (scales to zero).
2.  **No Maintenance**: No need to patch OS or manage VM security updates.
3.  **Scalability**: Automatically handles traffic spikes.
4.  **Auto-HTTPS**: Managed SSL certificates are provided for free.
