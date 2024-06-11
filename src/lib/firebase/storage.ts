import {ref, getDownloadURL, uploadBytes } from "firebase/storage";
import { storage } from "src/config/firebase";

export async function uploadFile(file: File | Blob | Uint8Array | ArrayBuffer, filename: string) {
  return new Promise(async (resolve, reject) => {
    try {
      const fileRef = ref(storage, filename)
      const snapshot = await uploadBytes(fileRef, file)
      console.log('Image Uploaded!');
      resolve(snapshot)
    }
    catch(e)  {
      reject(e)
    }
  })
}

export async function getDownloadUrl(imageRef: string) {
  return new Promise(async (resolve, reject) => {
    try {
      const fileRef = ref(storage, imageRef)
      const downloadURL = await getDownloadURL(fileRef)
      console.log('File available at', downloadURL);
      resolve(downloadURL)
    }
    catch(e)  {
      reject(e)
    }
  })
}