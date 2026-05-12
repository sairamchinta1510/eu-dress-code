import { Configuration, PublicClientApplication } from '@azure/msal-browser';

const clientId = process.env.REACT_APP_MSAL_CLIENT_ID || 'dev-placeholder';
const tenantId = process.env.REACT_APP_MSAL_TENANT_ID || 'common';

if (process.env.NODE_ENV !== 'test' && !process.env.REACT_APP_MSAL_CLIENT_ID) {
  console.warn('[msalConfig] REACT_APP_MSAL_CLIENT_ID is not set. Authentication will not work.');
}

const msalConfiguration: Configuration = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri: process.env.REACT_APP_MSAL_REDIRECT_URI || window.location.origin,
  },
  cache: {
    cacheLocation: 'sessionStorage',
  },
};

export const msalInstance = new PublicClientApplication(msalConfiguration);

export const loginRequest = {
  scopes: ['User.Read', 'Calendars.Read'],
};
