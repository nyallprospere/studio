'use client';

import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject, FirebaseStorage } from "firebase/storage";

/**
 * Uploads a file to Firebase Storage.
 * @param storage The Firebase Storage instance.
 * @param file The file to upload.
 * @param path The path where the file should be stored in the bucket.
 * @returns A promise that resolves with the public download URL of the file.
 */
export const uploadFile = async (storage: FirebaseStorage, file: File, path: string): Promise<string> => {
  const storageRef = ref(storage, path);
  
  try {
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error: any) {
    console.error(`Storage Upload Error for path: ${path}`, error);
    // Re-throw a more specific error to be caught by the calling function
    throw new Error(`Failed to upload file. (Code: ${error.code})`);
  }
};

/**
 * Deletes a file from Firebase Storage using its public URL.
 * @param storage The Firebase Storage instance.
 * @param fileUrl The public URL of the file to delete.
 * @returns A promise that resolves when the file is deleted.
 */
export const deleteFile = async (storage: FirebaseStorage, fileUrl: string): Promise<void> => {
    if (!fileUrl) return;

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
