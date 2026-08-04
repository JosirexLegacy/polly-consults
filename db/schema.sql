-- ============================================================
-- Loan & Savings Management System (LSM) — V1
-- PostgreSQL Schema — Phase 1
-- ============================================================
-- Design notes (see chat for full rationale):
--   - Single-tenant system (one business, one admin) — no
--     multi-tenant tables, keeps everything simple and fast.
--   - Money is stored in UGX as BIGINT (whole shillings, no
--     decimals needed for UGX) to avoid floating point errors.
--     If cents/decimals are ever needed, switch to NUMERIC(14,2).
--   - Every financial event that touches capital writes a row to
--     capital_transactions — this is the single source of truth
--     for "Current Capital" and is never deleted, only inserted.
--   - Loans, expenses, and income each optionally reference the
--     capital_transactions row they generated, so every number on
--     the dashboard can be traced back to its origin.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- for gen_random_uuid()

-- ------------------------------------------------------------
-- ENUM TYPES
-- ------------------------------------------------------------
CREATE TYPE repayment_frequency AS ENUM ('weekly', 'biweekly', 'monthly');
CREATE TYPE loan_status AS ENUM ('active', 'completed', 'overdue', 'cancelled');
CREATE TYPE payment_method AS ENUM ('cash', 'mobile_money', 'bank');
CREATE TYPE capital_txn_type AS ENUM ('credit', 'debit');
CREATE TYPE capital_txn_source AS ENUM (
  'capital_topup', 'loan_disbursement', 'loan_repayment',
  'expense', 'income', 'manual_adjustment'
);
CREATE TYPE interest_type AS ENUM ('flat', 'percentage');

-- ------------------------------------------------------------
-- ADMIN (single admin login)
-- ------------------------------------------------------------
CREATE TABLE admins (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name     VARCHAR(100),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- SETTINGS (single row — business-wide config)
-- ------------------------------------------------------------
CREATE TABLE settings (
  id                     BOOLEAN PRIMARY KEY DEFAULT TRUE, -- enforces a single row
  business_name          VARCHAR(150) NOT NULL DEFAULT 'My Business',
  business_logo_url      TEXT,
  currency               VARCHAR(10) NOT NULL DEFAULT 'UGX',
  default_interest_rate  NUMERIC(6,2) NOT NULL DEFAULT 10.00,
  default_interest_type  interest_type NOT NULL DEFAULT 'flat',
  low_capital_threshold  BIGINT NOT NULL DEFAULT 0,
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT settings_singleton CHECK (id = TRUE)
);

-- ------------------------------------------------------------
-- BUSINESS CAPITAL (current balance — single row, cached total)
-- ------------------------------------------------------------
CREATE TABLE business_capital (
  id              BOOLEAN PRIMARY KEY DEFAULT TRUE,
  current_amount  BIGINT NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT business_capital_singleton CHECK (id = TRUE)
);

-- capital_transactions is the append-only ledger.
-- current_amount above is a cached/denormalized running total,
-- kept in sync by the application (or a trigger — see note at
-- bottom) so the dashboard doesn't need to SUM() the whole ledger
-- on every page load.
CREATE TABLE capital_transactions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date         DATE NOT NULL DEFAULT CURRENT_DATE,
  amount       BIGINT NOT NULL CHECK (amount > 0),
  type         capital_txn_type NOT NULL, -- credit = money in, debit = money out
  source       capital_txn_source NOT NULL,
  reason       VARCHAR(255) NOT NULL,     -- e.g. "Loan Given to John", "Office Expense"
  balance_after BIGINT NOT NULL,          -- capital snapshot right after this txn
  loan_id      UUID,                      -- nullable FK, set below after loans table exists
  expense_id   UUID,
  income_id    UUID,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- CUSTOMERS
-- ------------------------------------------------------------
CREATE TABLE customers (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_url          TEXT,
  name               VARCHAR(150) NOT NULL,
  phone              VARCHAR(30) NOT NULL,
  address            VARCHAR(255),
  occupation         VARCHAR(100),
  national_id        VARCHAR(50),
  emergency_contact  VARCHAR(30),
  notes              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customers_phone ON customers (phone);
CREATE INDEX idx_customers_name ON customers (name);

-- ------------------------------------------------------------
-- LOANS
-- ------------------------------------------------------------
CREATE TABLE loans (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_number          SERIAL UNIQUE, -- human-friendly sequential number, e.g. LN-000042
  customer_id          UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  guarantor_name       VARCHAR(150),
  guarantor_phone      VARCHAR(30),
  principal_amount     BIGINT NOT NULL CHECK (principal_amount > 0),
  interest_rate        NUMERIC(6,2) NOT NULL DEFAULT 0,
  interest_type        interest_type NOT NULL DEFAULT 'flat',
  total_payable        BIGINT NOT NULL, -- principal + calculated interest, computed at creation
  amount_paid          BIGINT NOT NULL DEFAULT 0,
  remaining_balance    BIGINT NOT NULL, -- kept in sync with total_payable - amount_paid
  loan_date            DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date             DATE NOT NULL,
  repayment_frequency  repayment_frequency NOT NULL DEFAULT 'monthly',
  status               loan_status NOT NULL DEFAULT 'active',
  notes                TEXT,
  photo_url            TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_loans_customer_id ON loans (customer_id);
CREATE INDEX idx_loans_status ON loans (status);
CREATE INDEX idx_loans_due_date ON loans (due_date);

-- Now that loans exists, wire up the FK on capital_transactions
ALTER TABLE capital_transactions
  ADD CONSTRAINT fk_capital_txn_loan
  FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE SET NULL;

-- ------------------------------------------------------------
-- LOAN PAYMENTS (the loan timeline)
-- ------------------------------------------------------------
CREATE TABLE loan_payments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id               UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  payment_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  amount_paid           BIGINT NOT NULL CHECK (amount_paid > 0),
  remaining_balance_after BIGINT NOT NULL,
  payment_method        payment_method NOT NULL DEFAULT 'cash',
  collector_notes       TEXT,
  capital_transaction_id UUID REFERENCES capital_transactions(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_loan_payments_loan_id ON loan_payments (loan_id);
CREATE INDEX idx_loan_payments_date ON loan_payments (payment_date);

-- ------------------------------------------------------------
-- EXPENSES
-- ------------------------------------------------------------
CREATE TABLE expense_categories (
  id    SERIAL PRIMARY KEY,
  name  VARCHAR(50) UNIQUE NOT NULL
);

INSERT INTO expense_categories (name) VALUES
  ('Fuel'), ('Transport'), ('Rent'), ('Stationery'),
  ('Office'), ('Salary'), ('Other');

CREATE TABLE expenses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date         DATE NOT NULL DEFAULT CURRENT_DATE,
  category_id  INTEGER NOT NULL REFERENCES expense_categories(id),
  amount       BIGINT NOT NULL CHECK (amount > 0),
  description  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_expenses_date ON expenses (date);

ALTER TABLE capital_transactions
  ADD CONSTRAINT fk_capital_txn_expense
  FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE SET NULL;

-- ------------------------------------------------------------
-- INCOME
-- ------------------------------------------------------------
CREATE TABLE income_categories (
  id    SERIAL PRIMARY KEY,
  name  VARCHAR(50) UNIQUE NOT NULL
);

INSERT INTO income_categories (name) VALUES
  ('Commission'), ('Service Charge'), ('Investment'), ('Other');

CREATE TABLE income (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date         DATE NOT NULL DEFAULT CURRENT_DATE,
  category_id  INTEGER NOT NULL REFERENCES income_categories(id),
  amount       BIGINT NOT NULL CHECK (amount > 0),
  description  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_income_date ON income (date);

ALTER TABLE capital_transactions
  ADD CONSTRAINT fk_capital_txn_income
  FOREIGN KEY (income_id) REFERENCES income(id) ON DELETE SET NULL;

-- ------------------------------------------------------------
-- NOTIFICATIONS (generated, but persisted so they can be marked read)
-- ------------------------------------------------------------
CREATE TYPE notification_type AS ENUM (
  'loan_due_today', 'loan_overdue', 'large_expense', 'low_capital'
);

CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        notification_type NOT NULL,
  message     TEXT NOT NULL,
  related_loan_id UUID REFERENCES loans(id) ON DELETE CASCADE,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_is_read ON notifications (is_read);

-- ------------------------------------------------------------
-- SEED singleton rows
-- ------------------------------------------------------------
INSERT INTO settings (id) VALUES (TRUE);
INSERT INTO business_capital (id, current_amount) VALUES (TRUE, 0);

-- ============================================================
-- END OF PHASE 1
-- ============================================================