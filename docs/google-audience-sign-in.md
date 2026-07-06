# Google Sign-In for Audience

TicketBox uses Google Identity Services only to verify an audience user's identity. The backend exchanges the verified Google ID token for the normal TicketBox JWT; it does not store Google ID, access, or refresh tokens and does not request Gmail scopes.

## Google Cloud setup

1. Create a Google Auth Platform OAuth client with application type **Web application**.
2. Configure the application branding and add test users while the application is in Testing mode.
3. Add the audience origin to **Authorized JavaScript origins**. Local development uses `http://localhost:5173` (or the exact port printed by Vite).
4. Redirect URIs are not required for the popup/callback flow used by the audience app.
5. Add each future HTTPS production origin before deployment.

Configure the same public Web Client ID in both environments:

```env
# root .env, backend token audience verification
GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com

# apps/audience-web/.env.local, browser GIS initialization
VITE_GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
```

The Client ID is public configuration. Never put a Client Secret in a `VITE_` variable or commit Google credentials/tokens. No Gmail, Drive, or Calendar API needs to be enabled.

## Account behavior

- Google `sub` is the stable provider identity. Email is not used as the provider key.
- User emails also have a unique `trim().toLowerCase()` canonical key to prevent case/whitespace duplicates.
- First Google sign-in creates an `ACTIVE` user with a null password hash and only the `AUDIENCE` role.
- `POST /auth/google` issues a TicketBox JWT scoped to `roles: [AUDIENCE]`; privileged roles are never included.
- If the verified email already belongs to an unlinked TicketBox account, the API returns `ACCOUNT_LINK_REQUIRED`. Automatic linking is intentionally disabled.
- OAuth-only users do not see the current-password form. First-password setup and provider linking/unlinking are separate future features.
- A managed TicketBox avatar takes precedence over the verified Google picture. Removing the managed avatar reveals the Google picture fallback, then initials/default.

## Security and testing

The backend verifies signature, issuer, audience, expiry, subject, email, and `email_verified` through `google-auth-library`. Raw Google credentials are never logged or persisted. Automated tests inject or mock the verifier and must not depend on Google network access or real ID tokens.
