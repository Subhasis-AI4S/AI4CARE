# Deploying AI4CARE to Google Cloud Platform (GCP)

This guide provides instructions for hosting the AI4CARE application on a Google Compute Engine VM using **Google Cloud Shell**.

## Prerequisites
- A Google Cloud Platform account.
- An active project in GCP.
- Google Cloud Shell (accessible from the GCP Console).

---

## Step 1: Create a Compute Engine Instance
Open Google Cloud Shell and run the following command to create a small VM suitable for hosting this application:

```bash
gcloud compute instances create ai4care-vm \
    --zone=us-central1-a \
    --machine-type=e2-small \
    --image-family=debian-11 \
    --image-project=debian-cloud \
    --tags=http-server,https-server
```

## Step 2: Configure Firewall Rules
Allow traffic on port 3001 (the application port) and HTTP (port 80):

```bash
gcloud compute firewall-rules create allow-ai4care \
    --allow tcp:3001,tcp:80 \
    --target-tags=http-server
```

## Step 3: Connect to the VM and Setup Environment
SSH into your new VM:

```bash
gcloud compute ssh ai4care-vm --zone=us-central1-a
```

Once inside the VM, run these commands to install Node.js and Git:

```bash
# Update package list
sudo apt-get update

# Install Node.js (v18+)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs git-all sqlite3
```

## Step 4: Clone and Prepare Application
Clone your repository (replace `YOUR_REPO_URL` with your actual URL):

```bash
git clone YOUR_REPO_URL
cd ai4care
```

Build the frontend for production:

```bash
# Install root dependencies
npm install

# Build frontend
cd client
npm install
npm run build
cd ..
```

Install backend dependencies:

```bash
cd server
npm install
node db/setup.js
```

## Step 5: Run the Application
You can use `pm2` to keep the application running in the background:

```bash
# Install PM2
sudo npm install -g pm2

# Start the server
pm2 start server.js --name "ai4care"
```

The application is now accessible at `http://[YOUR_VM_EXTERNAL_IP]:3001`.

---

### Important Notes:
- **API Key**: Don't forget to configure your Gemini API key in the application settings once it's live.
- **Static Frontend**: The backend is configured to serve the frontend from `client/dist`. Ensure `npm run build` is executed in the `client` folder.
