import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadScreenshot = async (base64, domain) => {
  const sanitized = domain.replace(/[^a-zA-Z0-9]/g, "_");
  const result = await cloudinary.uploader.upload(
    `data:image/png;base64,${base64}`,
    {
      folder: "auditr/screenshots",
      public_id: `${sanitized}_${Date.now()}`,
      resource_type: "image",
    }
  );
  return result.secure_url;
};

export default cloudinary;