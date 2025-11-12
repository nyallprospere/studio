'use client';

import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject, FirebaseStorage } from "firebase/storage";
import { useFirebase } from ".";

/**
 * Uploads a file to Firebase Storage.
 * @param file The file to upload.
 * @param path The path where the file should be stored in the bucket.
 * @param storage Optional Firebase Storage instance.
 * @returns A promise that resolves with the public download URL of the file.
 */
export const uploadFile = async (file: File, path: string, storage?: FirebaseStorage): Promise<string> => {
  if (!storage) {
    storage = getStorage();
  }
  const storageRef = ref(storage, path);
  
  try {
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error: any) {
    console.error(`Storage Upload Error for path: ${path}`, error);
    // Re-throw the original error to preserve its details
    throw error;
  }
};

/**
 * Deletes a file from Firebase Storage using its public URL.
 * @param fileUrl The public URL of the file to delete.
 * @param storage Optional Firebase Storage instance.
 * @returns A promise that resolves when the file is deleted.
 */
export const deleteFile = async (fileUrl: string, storage?: FirebaseStorage): Promise<void> => {
    if (!fileUrl) return;

    if (!storage) {
      storage = getStorage();
    }

    try {
        const storageRef = ref(storage, fileUrl);
        await getDownloadURL(storageRef); // Check if file exists before trying to delete.
        await deleteObject(storageRef);
    } catch (error: any) {
        // It's common to encounter 'object-not-found' if the file is already deleted
        // or the URL is incorrect. We can choose to ignore this specific error.
        if (error.code === 'storage/object-not-found') {
            console.warn(`File not found for deletion, it might have been already deleted: ${fileUrl}`);
        } else {
            console.error(`Storage Deletion Error for URL: ${fileUrl}`, error);
            throw new Error(`Failed to delete file. (Code: ${error.code})`);
        }
    }
}
