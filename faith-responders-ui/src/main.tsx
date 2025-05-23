import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import { Auth0Provider } from '@auth0/auth0-react';

const domain = 'dev-jlng7b218gxwu5ag.us.auth0.com';
const clientId = '0Q3jMNzlCdjsU6GG1KHM3BnwkJjrt9gf';

// Create a wrapper to access useNavigate inside Auth0Provider
function AuthWrapper() {
  const navigate = useNavigate();

  const onRedirectCallback = (appState: any) => {
    navigate(appState?.returnTo || '/post-login');
  };

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
      }}
      onRedirectCallback={onRedirectCallback}
    >
      <App />
    </Auth0Provider>
  );
}

// Mount the whole app
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthWrapper />
    </BrowserRouter>
  </React.StrictMode>
);