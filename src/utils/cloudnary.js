import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

// Configure Cloudinary with actual environment variables
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET 
});

const uploadonCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        });
        fs.unlinkSync(localFilePath)
        // console.log("File is uploaded on Cloudinary:", response.secure_url);
        return response;
    } catch (error) {
        console.error("Error uploading file to Cloudinary:", error);
        // Optionally, you can choose to log the error or handle it in a different way
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath); // Delete the local file if it exists
        }
        return null;
    }
}

export { uploadonCloudinary };
