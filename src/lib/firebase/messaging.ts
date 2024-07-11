// import { getMessaging, getToken } from "firebase/messaging";
// import { messaging, retrieveToken, token } from "src/config/firebase";
// import * as admin from 'firebase-admin';

// export function requestPermission() {
//   Notification.requestPermission().then((permission) => {
//     if (permission === 'granted') {
//       console.log('Notification permission granted.');
//       const token = retrieveToken()
//       // TODO(developer): Retrieve a registration token for use with FCM.
//       // ...
//     } else {
//       console.log('Unable to get permission to notify.');
//     }
//   });
// }

// export async function sendNotification(title, body, topic) {
//   try {
//     const message = {
//       data: {
//         title: title,
//         body: body
//       },
//       topic: topic
//     };
  
//     const response = await admin.messaging().send(message);
  
//   }
//   catch (error) {

//   }


// }