// Importa os scripts do Firebase. Você não precisa alterar essas URLs.
importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js");

// Cole aqui as configurações do seu projeto Firebase
// Você encontra isso no seu Console do Firebase > Configurações do Projeto
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

// Inicializa o serviço de mensagens
const messaging = firebase.messaging();

// Opcional: Manipulador para notificações em segundo plano
// Este código é executado quando seu app recebe uma notificação enquanto está em segundo plano.
messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Received background message ",
    payload
  );

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: "/icons/icon-192x192.png" // Caminho para um ícone padrão
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
