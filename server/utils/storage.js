const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const { BlobServiceClient } = require('@azure/storage-blob');
const { Storage } = require('@google-cloud/storage');

/**
 * AI4CARE Multi-Cloud Storage Bridge
 * 
 * Automatically detects the cloud provider based on environment variables.
 * Order of preference: Azure > GCP > Cloudinary > Local Disk
 */

const getActiveProvider = () => {
    if (process.env.AZURE_STORAGE_CONNECTION_STRING) return 'azure';
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GCS_BUCKET) return 'gcp';
    if (process.env.CLOUDINARY_URL || process.env.CLOUDINARY_CLOUD_NAME) return 'cloudinary';
    return 'local';
};

const provider = getActiveProvider();
console.log(`[Storage] Initialized with provider: ${provider}`);

// --- Internal Cloudinary Helper ---
if (provider === 'cloudinary') {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true
    });
}

/**
 * Uploads a file to the active storage provider.
 * @param {Object} file - The file object from multer (req.file)
 * @returns {Promise<Object>} - Returns { fileName, url, provider }
 */
const uploadFile = async (file) => {
    switch (provider) {
        case 'azure':
            const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
            const containerClient = blobServiceClient.getContainerClient(process.env.AZURE_STORAGE_CONTAINER || 'patient-documents');
            const blobName = `${Date.now()}-${file.originalname}`;
            const blockBlobClient = containerClient.getBlockBlobClient(blobName);
            await blockBlobClient.uploadFile(file.path);
            return {
                fileName: blobName,
                url: blockBlobClient.url,
                provider: 'azure'
            };

        case 'gcp':
            const gcs = new Storage();
            const bucket = gcs.bucket(process.env.GCS_BUCKET);
            const gcsFileName = `${Date.now()}-${file.originalname}`;
            const gcsFile = bucket.file(gcsFileName);
            await bucket.upload(file.path, { destination: gcsFileName });
            return {
                fileName: gcsFileName,
                url: `https://storage.googleapis.com/${process.env.GCS_BUCKET}/${gcsFileName}`,
                provider: 'gcp'
            };

        case 'cloudinary':
            const result = await cloudinary.uploader.upload(file.path, {
                folder: 'ai4care/patient_documents',
                resource_type: 'auto'
            });
            return {
                fileName: result.public_id,
                url: result.secure_url,
                provider: 'cloudinary'
            };

        case 'local':
        default:
            // Multer already saved it to server/uploads/
            return {
                fileName: file.filename,
                url: `/api/sessions/documents/view/${file.filename}`,
                provider: 'local'
            };
    }
};

/**
 * Deletes a file from the active storage provider.
 * @param {string} fileKey - The fileName or public_id
 */
const deleteFile = async (fileKey) => {
    if (!fileKey) return;
    
    try {
        switch (provider) {
            case 'azure':
                const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
                const containerClient = blobServiceClient.getContainerClient(process.env.AZURE_STORAGE_CONTAINER || 'patient-documents');
                await containerClient.deleteBlob(fileKey);
                break;
            case 'gcp':
                const gcs = new Storage();
                await gcs.bucket(process.env.GCS_BUCKET).file(fileKey).delete();
                break;
            case 'cloudinary':
                await cloudinary.uploader.destroy(fileKey);
                break;
            case 'local':
                const filePath = path.join(__dirname, '..', 'uploads', fileKey);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
                break;
        }
    } catch (err) {
        console.error(`[Storage] Failed to delete file ${fileKey}:`, err.message);
    }
};

module.exports = {
    uploadFile,
    deleteFile,
    provider
};
