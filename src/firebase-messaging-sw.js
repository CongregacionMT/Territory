// eslint-disable-next-line
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

// Comentario: Inicializa la aplicación Firebase con tu configuración
firebaseConfig = {
  apiKey: "AIzaSyBdRptzrCwkDB1WvWNU1x-Pn22l48kslEs",
  authDomain: "territorios---wheelwright.firebaseapp.com",
  projectId: "territorios---wheelwright",
  storageBucket: "territorios---wheelwright.firebasestorage.app",
  messagingSenderId: "208368329126",
  appId: "1:208368329126:web:157824c7b22b4bc7f0ef67",
  measurementId: "G-XLQ9YJ42HL"
};

firebase.initializeApp(firebaseConfig);

messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  console.log('[firebase-messaging-sw.js] Recibido en segundo plano:', payload);
});
