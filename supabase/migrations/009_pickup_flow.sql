-- =============================================
-- Migration 009: Pickup flow separation
-- =============================================

-- 1. Add scheduled_at column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;

-- 2. Add picked_up_by_customer value to order_status enum
--    (PostgreSQL requires this to be outside a transaction for ADD VALUE)
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'picked_up_by_customer';
