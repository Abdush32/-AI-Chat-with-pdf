import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadFile as uploadToStorage } from "../services/storage.service.js";

const uploadFile = asyncHandler(async (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ message: "No file uploaded!" });
  }
  try {
    const response = await uploadToStorage(file);
    res.status(200).json({ message: "File uploaded successfully!", response });
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({
      message: "Error uploading file!",
      error: error?.message || "Unknown error",
    });
  }
});

export { uploadFile };