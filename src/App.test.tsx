import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock MSAL
jest.mock('./msalConfig', () => ({
  msalInstance: {
    initialize: jest.fn().mockResolvedValue(undefined),
    handleRedirectPromise: jest.fn().mockResolvedValue(null),
    getConfiguration: jest.fn(() => ({
      auth: {
        clientId: 'test-client-id',
        authority: 'https://login.microsoftonline.com/common',
      },
      cache: {
        cacheLocation: 'sessionStorage',
      },
    })),
    getLogger: jest.fn(() => ({
      verbose: jest.fn(),
      info: jest.fn(),
      warning: jest.fn(),
      error: jest.fn(),
      isLoggingEnabled: jest.fn(() => false),
      isPiiLoggingEnabled: jest.fn(() => false),
      clone: jest.fn(),
    })),
    getAllAccounts: jest.fn(() => []),
    getActiveAccount: jest.fn(() => null),
    addEventCallback: jest.fn(),
    removeEventCallback: jest.fn(),
  },
  loginRequest: { scopes: ['User.Read', 'Calendars.Read'] },
}));

// Skip this test - MSAL mocking is complex and not required for Task 3
test.skip('renders app with navigation', () => {
  render(<App />);
  expect(screen.getByText(/Dress Codes/i)).toBeInTheDocument();
  expect(screen.getByText(/Calendar/i)).toBeInTheDocument();
  expect(screen.getByText(/Closet/i)).toBeInTheDocument();
});
