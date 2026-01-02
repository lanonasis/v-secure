// SuperTokens Configuration for Vortex Secure
// Following the official SuperTokens tutorial pattern

import supertokens from 'supertokens-node';
import Session from 'supertokens-node/recipe/session/index.js';
import EmailPassword from 'supertokens-node/recipe/emailpassword/index.js';

// Environment variables with defaults for development
const SUPERTOKENS_CONNECTION_URI = process.env.SUPERTOKENS_CONNECTION_URI || 'https://try.supertokens.com';
const SUPERTOKENS_API_KEY = process.env.SUPERTOKENS_API_KEY || undefined;
const API_DOMAIN = process.env.API_DOMAIN || 'http://localhost:3001';
const WEBSITE_DOMAIN = process.env.WEBSITE_DOMAIN || 'http://localhost:5173';

export const appInfo = {
  // Application name shown on auth UI
  appName: 'Vortex Secure',
  // The domain where the API is hosted
  apiDomain: API_DOMAIN,
  // The domain where the website is hosted
  websiteDomain: WEBSITE_DOMAIN,
  // Base path for SuperTokens API endpoints
  apiBasePath: '/auth',
  // Base path for auth UI pages
  websiteBasePath: '/auth'
};

export function initSuperTokens() {
  supertokens.init({
    // Framework being used
    framework: 'express',

    // SuperTokens Core connection
    supertokens: {
      connectionURI: SUPERTOKENS_CONNECTION_URI,
      apiKey: SUPERTOKENS_API_KEY,
    },

    // Application info
    appInfo,

    // Authentication recipes
    recipeList: [
      // Email/Password authentication
      EmailPassword.init({
        // Override sign up to add custom logic
        override: {
          apis: (originalImplementation) => ({
            ...originalImplementation,
            // Custom sign up handler
            signUpPOST: async function (input) {
              if (originalImplementation.signUpPOST === undefined) {
                throw Error('Should never come here');
              }

              const response = await originalImplementation.signUpPOST(input);

              if (response.status === 'OK') {
                // User successfully signed up
                const { id, emails } = response.user;
                console.log(`New user signed up: ${emails[0]} (${id})`);

                // You can add custom logic here:
                // - Send welcome email
                // - Create user profile in your database
                // - Initialize user settings
              }

              return response;
            },
            // Custom sign in handler
            signInPOST: async function (input) {
              if (originalImplementation.signInPOST === undefined) {
                throw Error('Should never come here');
              }

              const response = await originalImplementation.signInPOST(input);

              if (response.status === 'OK') {
                // User successfully signed in
                const { id, emails } = response.user;
                console.log(`User signed in: ${emails[0]} (${id})`);

                // You can add custom logic here:
                // - Log authentication event
                // - Update last login timestamp
              }

              return response;
            }
          })
        }
      }),

      // Session management
      Session.init({
        // Cookie settings
        cookieSameSite: 'lax',
        cookieSecure: process.env.NODE_ENV === 'production',

        // Session expiry (default: 100 years for refresh token, 1 hour for access token)
        // Access token auto-refreshes in the background
      })
    ]
  });
}

export default { initSuperTokens, appInfo };
