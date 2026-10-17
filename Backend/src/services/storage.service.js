import ImageKit from '@imagekit/nodejs';
import dotenv from 'dotenv'


dotenv.config() 

const client = new ImageKit({
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY, 
});



async function uploadFile(file) {
  try {
    const uploadableFile = new File([file.buffer], file.originalname, {
      type: file.mimetype || "application/octet-stream",
    });

    const response = await client.files.upload({
      file: uploadableFile,
      fileName: file.originalname,
    });
    return response;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  } 
}

export { uploadFile };
