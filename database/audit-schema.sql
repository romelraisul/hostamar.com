-- ============================================================
-- Append-Only Admin Audit Table
-- ============================================================
-- Purpose: Immutable record of all admin actions for security
--          compliance and incident investigation.
-- ============================================================

-- Prisma schema addition (add to prisma/schema.prisma):
--
-- model AdminAuditLog {
--   id        String   @id @default(cuid())
--   action    String   // e.g. 'model_load', 'model_unload', 'model_toggle_async',
--                      //       'subscription_cancel', 'service_update', 'admin_login',
--                      //       'admin_logout', 'password_change', 'settings_update'
--   details   String?  // JSON blob with action-specific data
--   modelId   String?  // Model ID if action relates to a model
--   adminId   String   // ID of the admin who performed the action
--   adminEmail String  // Email of the admin (denormalized for query speed)
--   ipAddress String   // Source IP
--   userAgent String?  // Browser/Client user agent
--   success   Boolean  @default(true) // Whether the action succeeded
--   errorMsg  String?  // Error message if failed
--   createdAt DateTime @default(now()) // Immutable — never updated
--
--   @@index([adminId, createdAt(sort: Desc)])
--   @@index([action, createdAt(sort: Desc)])
--   @@index([createdAt(sort: Desc)])
--   @@map("admin_audit_logs")
-- }

-- ============================================================
-- Raw SQL: Create the audit table (fallback if not using Prisma)
-- ============================================================

CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    action      TEXT NOT NULL,
    details     TEXT,
    model_id    TEXT,
    admin_id    TEXT NOT NULL,
    admin_email TEXT NOT NULL,
    ip_address  TEXT NOT NULL,
    user_agent  TEXT,
    success     BOOLEAN NOT NULL DEFAULT TRUE,
    error_msg   TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_admin_id ON admin_audit_logs(admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON admin_audit_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_ip ON admin_audit_logs(ip_address);

-- ============================================================
-- Enforcement: Make the table truly append-only
-- ============================================================

-- 1. Prevent updates
CREATE OR REPLACE FUNCTION prevent_audit_update()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Admin audit log is append-only. Updates are not allowed.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_no_update
    BEFORE UPDATE ON admin_audit_logs
    FOR EACH ROW EXECUTE FUNCTION prevent_audit_update();

-- 2. Prevent deletes
CREATE OR REPLACE FUNCTION prevent_audit_delete()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Admin audit log is append-only. Deletes are not allowed.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_no_delete
    BEFORE DELETE ON admin_audit_logs
    FOR EACH ROW EXECUTE FUNCTION prevent_audit_delete();

-- ============================================================
-- Helper: Log an admin action
-- ============================================================

CREATE OR REPLACE FUNCTION log_admin_action(
    p_action TEXT,
    p_admin_id TEXT,
    p_admin_email TEXT,
    p_ip_address TEXT,
    p_details TEXT DEFAULT NULL,
    p_model_id TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_success BOOLEAN DEFAULT TRUE,
    p_error_msg TEXT DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE
    v_id TEXT;
BEGIN
    INSERT INTO admin_audit_logs (
        action, details, model_id, admin_id, admin_email,
        ip_address, user_agent, success, error_msg
    ) VALUES (
        p_action, p_details, p_model_id, p_admin_id, p_admin_email,
        p_ip_address, p_user_agent, p_success, p_error_msg
    )
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Usage:
-- SELECT log_admin_action(
--     'model_load',
--     'admin-001',
--     'admin@hostamar.com',
--     '192.168.1.100',
--     '{"model":"qwen3.6:27B","asyncOnly":true}',
--     'qwen3.6:27B',
--     'Mozilla/5.0...',
--     true
-- );

-- ============================================================
-- Common queries
-- ============================================================

-- Recent admin activity
-- SELECT * FROM admin_audit_logs ORDER BY created_at DESC LIMIT 50;

-- Activity by a specific admin
-- SELECT * FROM admin_audit_logs WHERE admin_email = 'admin@hostamar.com'
--   AND created_at > NOW() - INTERVAL '7 days'
--   ORDER BY created_at DESC;

-- Failed actions in last 24h
-- SELECT * FROM admin_audit_logs WHERE success = false
--   AND created_at > NOW() - INTERVAL '24 hours'
--   ORDER BY created_at DESC;

-- Model changes only
-- SELECT * FROM admin_audit_logs WHERE model_id IS NOT NULL
--   ORDER BY created_at DESC;

-- Action counts (for metrics/alerting)
-- SELECT action, COUNT(*) as count FROM admin_audit_logs
--   WHERE created_at > NOW() - INTERVAL '24 hours'
--   GROUP BY action ORDER BY count DESC;

-- Suspicious activity (multiple IPs from same admin)
-- SELECT admin_email, COUNT(DISTINCT ip_address) as ip_count
--   FROM admin_audit_logs
--   WHERE created_at > NOW() - INTERVAL '7 days'
--   GROUP BY admin_email HAVING COUNT(DISTINCT ip_address) > 3;
