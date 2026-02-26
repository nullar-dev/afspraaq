-- Rate Limiting Configuration for Self-Hosted Supabase
-- These are configured via environment variables in your Supabase stack

-- For Gotrue (Auth) rate limiting, add these to your Supabase configuration:

-- GOTRUE_RATE_LIMIT_EMAIL_SEND=5       -- Max 5 emails per minute
-- GOTRUE_RATE_LIMIT_TOKEN_REFRESH=10  -- Max 10 token refreshes per minute
-- GOTRUE_RATE_LIMIT_LOGIN=5           -- Max 5 login attempts per minute

-- Note: For self-hosted Supabase on Coolify, configure these in your
-- Supabase service's environment variables or in gotrue.yml
