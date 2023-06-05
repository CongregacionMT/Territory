// eslint-disable-next-line
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

// Comentario: Inicializa la aplicación Firebase con tu configuración
firebaseConfig = {
  projectId: 'territorios-422c2',
  appId: '1:1086542552314:web:a5afc53afaa2f305ebfd43',
  storageBucket: 'territorios-422c2.appspot.com',
  locationId: 'us-central',
  apiKey: 'AIzaSyBI1BYUtYjEeEWiFfpR_IwGFip4R54dbVk',
  authDomain: 'territorios-422c2.firebaseapp.com',
  messagingSenderId: '1086542552314',
};

firebase.initializeApp(firebaseConfig);

messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  console.log('[firebase-messaging-sw.js] Recibido en segundo plano:', payload);
});
