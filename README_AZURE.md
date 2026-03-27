# Hosting AI4CARE on Microsoft Azure

This guide provides a comprehensive, step-by-step strategy for deploying the AI4CARE SaaS application to Microsoft Azure. To ensure high availability, scalability, and that all features (including file uploads and AI generation) work perfectly, we will use a **Platform as a Service (PaaS)** architecture.

## Architecture Overview

To transition from your local development environment to a production-ready Azure environment, we recommend the following services:

1.  **Frontend (React/Vite)**: **Azure Static Web Apps**
    *   *Why:* Automatically builds and hosts your frontend directly from a GitHub repository. Extremely fast, globally distributed, and offers free SSL certificates.
2.  **Backend (Node.js/Express)**: **Azure App Service (Web App for Containers or Code)**
    *   *Why:* A fully managed HTTP-based service for hosting web applications. It scales automatically and perfectly handles your Node.js backend.
3.  **Database (SQLite to PostgreSQL)**: **Azure Database for PostgreSQL - Flexible Server**
    *   *Why:* **CRITICAL STEP.** Azure App Services have ephemeral (temporary) local file systems. If you use the local `ai4care.db` SQLite file, your data will be permanently lost whenever the server restarts or scales. You *must* migrate to a managed PostgreSQL database for production SaaS use.
4.  **File Storage (Uploads)**: **Azure Blob Storage**
    *   *Why:* Like the database, local uploads to the `/uploads` folder will be lost on App Service restarts. You need to configure Multer to upload to Azure Blob Storage using the `@azure/storage-blob` npm package.

---

## Step 1: Database Setup (Azure PostgreSQL)

1.  Log in to the **Azure Portal**.
2.  Search for **Azure Database for PostgreSQL servers** and click **Create**.
3.  Choose **Flexible server**.
4.  Configure your server (Choose a region close to your users, and the "Burstable" B1ms compute tier to save costs initially).
5.  Set an Admin username and password. **Save these credentials securely.**
6.  Under **Networking**, select "Allow public access from any Azure service within Azure to this server".
7.  Once deployed, get the **Server name** (e.g., `ai4care-db.postgres.database.azure.com`).

*Note:* You will need to update your backend code to use the `pg` library instead of `sqlite3` to connect to this database.

## Step 2: File Storage (Azure Blob Storage)

1.  In the Azure Portal, create a new **Storage Account**.
2.  Once created, go to **Containers** and create a container named `patient-documents` (Set public access level to "Blob" if you want easy retrieval, or "Private" for security).
3.  Go to **Access keys** and copy the **Connection string**.
4.  *Code Change Required:* Install `multer-azure-blob-storage`. Update your `server/server.js` Multer configuration to use this storage engine instead of local disk storage.

## Step 3: Backend Deployment (Azure App Service)

1.  In the Azure Portal, search for **App Services** and click **Create**.
2.  Select **Web App**.
3.  **Publish:** Choose "Code" or "Docker Container" (Code is easier).
4.  **Runtime stack:** Choose **Node 20 LTS** (or 24 LTS if available).
5.  **Operating System:** Linux.
6.  Once created, navigate to your App Service and go to **Settings > Environment variables** (or Configuration).
7.  Add your critical environment variables:
    *   `PORT`: `8080` (Azure App Service uses port 8080 by default for Node.js on Linux).
    *   `JWT_SECRET`: Your super secure secret key.
    *   `DATABASE_URL`: `postgres://<user>:<password>@<server-name>.postgres.database.azure.com:5432/postgres?sslmode=require`
    *   `AZURE_STORAGE_CONNECTION_STRING`: The connection string from Step 2.
    *   `GEMINI_API_KEY`: The default fallback API key.
8.  **Deploy Code:** You can deploy your `/server` folder directly via VS Code (using the Azure App Service extension) or connect it to a GitHub repository via the **Deployment Center** menu.

## Step 4: Frontend Deployment (Azure Static Web Apps)

1.  Push your entire codebase to a GitHub repository.
2.  In the Azure Portal, search for **Static Web Apps** and click **Create**.
3.  Sign in with GitHub and select your repository and branch.
4.  **Build Details:**
    *   **Build Presets:** React
    *   **App location:** `/client` (The folder containing your React code).
    *   **Api location:** Leave blank (Since we hosted the backend separately).
    *   **Output location:** `dist`
5.  Click Review + Create. Azure will automatically create a GitHub Action that builds and deploys your frontend.
6.  **Crucial Step:** Once deployed, open your Static Web App. You must update your React frontend code to point to the new Azure App Service URL instead of `http://localhost:3001`.
    *   *Tip:* Use Vite environment variables (`.env.production`) to set `VITE_API_BASE_URL=https://your-backend-app-name.azurewebsites.net`. Update all `fetch()` calls in your React app to use this URL.

## Summary of Code Changes Needed Before Deployment:

To make AI4CARE "Azure Ready" and prevent data loss, you must modify the codebase:
1.  **Database Migration:** Swap `sqlite3` for `pg` (PostgreSQL) in `server/db/database.js` and all SQL query syntax.
2.  **Storage Migration:** Swap local Multer storage for Azure Blob Storage in `server/server.js`.
3.  **Frontend URLs:** Ensure frontend `fetch('/api/...')` calls are prefixed with the backend's absolute URL in production.

If you would like me to perform the **PostgreSQL and Azure Blob Storage code migrations** for you right now so the code is 100% ready for this Azure guide, just let me know!
