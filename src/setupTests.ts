// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock MSAL for test environment
jest.mock('@azure/msal-browser', () => ({
  PublicClientApplication: jest.fn().mockImplementation(() => ({
    loginPopup: jest.fn(),
    logoutPopup: jest.fn(),
    acquireTokenSilent: jest.fn(),
  })),
}));

jest.mock('@azure/msal-react', () => ({
  useMsal: jest.fn(() => ({
    instance: {
      loginPopup: jest.fn(),
      logoutPopup: jest.fn(),
      acquireTokenSilent: jest.fn(),
    },
    accounts: [],
  })),
  MsalProvider: ({ children }: { children: React.ReactNode }) => children,
}));
