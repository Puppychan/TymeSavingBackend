import { getApps, initializeApp } from 'firebase/app'
import { getStorage } from 'firebase/storage'
// import { getMessaging, getToken, onMessage } from "firebase/messaging";
import serviceAccount from "../../serviceAccountKey.json";
import admin from 'firebase-admin';
import { ServiceAccount } from 'firebase-admin';


export const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
}

export const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
export const storage = getStorage(firebaseApp)

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as ServiceAccount),
    storageBucket: firebaseConfig.storageBucket,
  });
}


// export const messaging = getMessaging(firebaseApp);

export async function sendNotificationToDevice(token: string, title: string, body: any) {
  const message = {
    notification: {
      title: title,
      body: body,
    },
    token: token,
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('Successfully sent message:', response);
  } catch (error) {
    console.log('Error sending message:', error);
  }
}


// export const token = retrieveToken()

// export function retrieveToken() {
//   let token = null
//   getToken(messaging, { vapidKey: process.env.FIREBASE_VAPID_KEY })
//   .then((currentToken) => {
//     if (currentToken) {
//       token = currentToken
//     } else {
//       console.log('FCM: No registration token available. Request permission to generate one.')
//     }
//   })
//   .catch((err) => {
//     console.log('FCM: Failed to get token - ', err)
//   });
//   return token
// }