-- Migration 010: Add delivery_failed to order_status enum
-- (PostgreSQL requires ADD VALUE outside a transaction)
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'delivery_failed';
