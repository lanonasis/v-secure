# PKCE Migration Status

- ✅ Schema template (`scripts/neon_06_auth_gateway_oauth.sql`) lives in the primary database repo and has been applied to Neon.
- ✅ Client seeds cover IDE extensions (Cursor, Windsurf), CLI, dashboard, and partner placeholder entries ready for activation.
- ✅ Control room endpoint registry rows now read `status='live'` for `oauth-authorize`, `oauth-token`, `oauth-token/refresh`, and `oauth-userinfo`.
- ✅ Nginx routes `/oauth/*` to auth-gateway (port 4000); handlers are deployed and responding.
- 🔄 Next steps: onboard additional clients as needed and monitor `auth_gateway.oauth_audit_log` for live traffic; update `status` to `degraded` if health checks fail.

All templates are in place and live; future adjustments should extend the seeded clients or tighten scopes/PKCE policies as new integrations roll out.
