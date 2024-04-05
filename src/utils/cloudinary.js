import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

//Cloudinary configaration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRETE,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    //   Upload file on Cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    //file uploaded successfully
    console.log("File uploaded successfully in cloudinary: ", response.url);
    fs.unlinkSync(localFilePath); //Removes the locally saved file if upload got succeed
    return uploadResponse;
  } catch (error) {
    fs.unlinkSync(localFilePath); //Removes the locally saved file if upload got failed
  }
};

export { uploadOnCloudinary };
