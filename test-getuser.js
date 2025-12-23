const { initializeApp } = require('firebase/app');
const { getFunctions, httpsCallable, connectFunctionsEmulator } = require('firebase/functions');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

const firebaseConfig = {
  apiKey: "AIzaSyCO1zT94A0eeCkVKj_pPery2tt2LAb4kS4",
  authDomain: "faith-responders-prod.firebaseapp.com",
  projectId: "faith-responders-prod",
  storageBucket: "faith-responders-prod.firebasestorage.app",
  messagingSenderId: "1033982753837",
  appId: "1:1033982753837:web:eb85c1eede859356488ca4",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const functions = getFunctions(app);

async function test() {
  try {
    console.log('Logging in...');
    const userCred = await signInWithEmailAndPassword(auth, 'test@test.com', 'password123');
    console.log('Logged in as:', userCred.user.uid);

    console.log('Calling getUser...');
    const getUserFn = httpsCallable(functions, 'getUser');
    const result = await getUserFn({ userId: userCred.user.uid });

    console.log('Success!', result.data);
  } catch (error) {
    console.error('Error:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error details:', error.details);
  }
  process.exit(0);
}

test();
