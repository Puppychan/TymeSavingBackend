import {ref, getDownloadURL, uploadBytes } from "firebase/storage";
import { storage } from "src/config/firebase";


export async function uploadFile(file: File | Blob | Uint8Array | ArrayBuffer, filename: string) {
  return new Promise<string>(async (resolve, reject) => {
    try {
      const fileRef = ref(storage, filename)
      await uploadBytes(fileRef, file)
      const downloadURL = await getDownloadURL(fileRef)
      console.log('File available at', downloadURL);
      resolve(downloadURL)
    }
    catch(e)  {
      reject(e)
    }
  })
}