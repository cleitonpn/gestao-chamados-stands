// Importa os scripts do Workbox e do Firebase
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js');
importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js");

// Esta linha é a "marcadora" que o plugin PWA precisa para injetar a lista de arquivos.
// Não remova!
workbox.precaching.precacheAndRoute(self.__WB_MANIFEST);

// Cole aqui as configurações do seu projeto Firebase
const firebaseConfig = {
   apiKey: "AIzaSyAJRaV-rBHBbbsygASDyY6ZbW1WJ8SKu8A",
  authDomain: "gestao-chamados-stands.firebaseapp.com",
  projectId: "gestao-chamados-stands",
  storageBucket: "gestao-chamados-stands.firebasestorage.app",
  messagingSenderId: "468392158134",
  appId: "1:468392158134:web:8e6f6419bcbb72a3bdd717"
};

// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Manipulador para notificações em segundo plano
messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Received background message ",
    payload
  );

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: "/icons/icon-192x192.png"
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
