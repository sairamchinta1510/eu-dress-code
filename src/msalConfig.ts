import { Configuration, PublicClientApplication } from '@azure/msal-browser';

const msalConfiguration: Configuration = {
  auth: {
    clientId: process.env.REACT_APP_MSAL_CLIENT_ID || '',
    authority: `https://login.microsoftonline.com/${process.env.REACT_APP_MSAL_TENANT_ID || 'common'}`,
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
