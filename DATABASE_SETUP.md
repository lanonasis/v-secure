# Database Setup for Vortex API Key Manager

This guide explains how to set up the database for the Vortex API Key Manager using Supabase.

## Prerequisites

1. A Supabase account (free tier available at https://supabase.com/)
2. Supabase CLI installed (optional but recommended)

## Setup Steps

### 1. Create a Supabase Project

1. Go to https://supabase.com/ and sign in or create an account
2. Click "New Project" in your Supabase dashboard
3. Choose a name for your project (e.g., "vortex-api-keys")
4. Select a region closest to your users
5. Set a strong database password
6. Click "Create new project"

Wait for the project to be created (this may take a few minutes).

### 2. Apply the Database Schema

Once your project is ready:

1. In your Supabase project dashboard, go to the SQL Editor
2. Copy the contents of `supabase-schema.sql` from this repository
3. Paste it into the SQL Editor
4. Click "Run" to execute the schema

This will create all the necessary tables and set up Row Level Security (RLS).

### 3. Configure Environment Variables

You'll need to configure the following environment variables for both the CLI and SDK:

```bash
# For CLI usage
VORTEX_API_URL=https://your-project.supabase.co
VORTEX_API_KEY=your-supabase-anon-key

# For SDK usage
VORTEX_MCP_TOKEN=your-mcp-access-token
```

To get these values:

1. Go to your Supabase project settings
2. Navigate to "API" section
3. Copy the Project URL and anon key

### 4. Set Up Authentication

The schema includes authentication tables. You'll need to set up:

1. User registration and login
2. Project ownership
3. Team member management

Refer to the Supabase documentation for setting up authentication flows.

### 5. Configure Row Level Security

The schema already includes RLS policies, but you may want to customize them based on your needs:

- Projects are owned by users
- Secrets are scoped to projects
- Access is controlled by team membership
- MCP tools have specific permissions

### 6. Testing the Setup

After setting up the database:

1. Use the CLI to initialize a project:
   ```bash
   vortex init my-first-project
   ```

2. Create a test secret:
   ```bash
   vortex set TEST_SECRET --generate
   ```

3. Verify the secret was created in the database

## Troubleshooting

### Common Issues

1. **RLS Errors**: Make sure your user is authenticated and has the proper permissions
2. **Connection Issues**: Verify your Supabase URL and API key are correct
3. **Schema Errors**: Ensure all tables were created successfully

### Useful Supabase Queries

Check secrets count:
```sql
SELECT COUNT(*) FROM secrets;
```

Check active projects:
```sql
SELECT name, created_at FROM projects;
```

## Security Considerations

1. Always use strong, unique passwords
2. Rotate your Supabase API keys regularly
3. Limit access to the database
4. Monitor usage and access logs
5. Use environment variables for sensitive configuration

## Next Steps

1. Integrate with your applications using the SDK
2. Set up automated secret rotation
3. Configure MCP tool access for AI agents
4. Set up monitoring and alerting

For more information, see the main README.md and the Supabase documentation.
