-- Village Bank (VSLA) — PostgreSQL schema for Neon
-- Converted from the original MySQL schema, plus tables for SMS reset,
-- login lockout, group voting on join requests, and per-member share-out lines.

CREATE TABLE IF NOT EXISTS users (
  id                SERIAL PRIMARY KEY,
  username          VARCHAR(50) UNIQUE NOT NULL,
  password          VARCHAR(255) NOT NULL,
  role              VARCHAR(20) NOT NULL CHECK (role IN ('admin','treasurer','secretary','member')),
  full_name         VARCHAR(120) NOT NULL,
  phone             VARCHAR(20),
  language          VARCHAR(5) NOT NULL DEFAULT 'ny' CHECK (language IN ('en','ny')),
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  failed_attempts   INT NOT NULL DEFAULT 0,
  locked_until      TIMESTAMPTZ,
  last_login        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS members (
  id                 SERIAL PRIMARY KEY,
  user_id            INT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  membership_number  VARCHAR(20) UNIQUE NOT NULL,
  date_joined        DATE NOT NULL DEFAULT CURRENT_DATE,
  status             VARCHAR(10) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  village            VARCHAR(120),
  address            TEXT,
  next_of_kin        VARCHAR(120),
  next_of_kin_phone  VARCHAR(20)
);

-- A cycle is one saving period. The group runs a one-year cycle by default.
CREATE TABLE IF NOT EXISTS cycles (
  id             SERIAL PRIMARY KEY,
  cycle_name     VARCHAR(100) NOT NULL,
  start_date     DATE NOT NULL,
  end_date       DATE NOT NULL,
  share_value    NUMERIC(12,2) NOT NULL DEFAULT 1000,
  status         VARCHAR(12) NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS savings (
  id           SERIAL PRIMARY KEY,
  member_id    INT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  cycle_id     INT REFERENCES cycles(id) ON DELETE SET NULL,
  amount       NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  shares       INT NOT NULL DEFAULT 1,
  date         DATE NOT NULL DEFAULT CURRENT_DATE,
  note         TEXT,
  recorded_by  INT NOT NULL REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loans (
  id             SERIAL PRIMARY KEY,
  member_id      INT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  cycle_id       INT REFERENCES cycles(id) ON DELETE SET NULL,
  amount         NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  -- The borrower chooses at application time whether to carry interest.
  with_interest  BOOLEAN NOT NULL DEFAULT TRUE,
  interest_rate  NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  purpose        TEXT,
  status         VARCHAR(12) NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','approved','rejected','repaid','defaulted')),
  due_date       DATE,
  decision_note  TEXT,
  applied_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_at     TIMESTAMPTZ,
  approved_by    INT REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS loan_repayments (
  id            SERIAL PRIMARY KEY,
  loan_id       INT NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  amount        NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  -- How this payment was split. Interest is banked separately from savings.
  principal_part NUMERIC(12,2) NOT NULL DEFAULT 0,
  interest_part  NUMERIC(12,2) NOT NULL DEFAULT 0,
  date          DATE NOT NULL DEFAULT CURRENT_DATE,
  recorded_by   INT NOT NULL REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fines (
  id           SERIAL PRIMARY KEY,
  member_id    INT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  cycle_id     INT REFERENCES cycles(id) ON DELETE SET NULL,
  amount       NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  reason       TEXT,
  paid         BOOLEAN NOT NULL DEFAULT FALSE,
  date         DATE NOT NULL DEFAULT CURRENT_DATE,
  recorded_by  INT NOT NULL REFERENCES users(id)
);

-- Social fund: sickness, funerals, emergencies.
CREATE TABLE IF NOT EXISTS welfare_fund (
  id           SERIAL PRIMARY KEY,
  member_id    INT REFERENCES members(id) ON DELETE SET NULL,
  cycle_id     INT REFERENCES cycles(id) ON DELETE SET NULL,
  amount       NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  type         VARCHAR(12) NOT NULL CHECK (type IN ('contribution','payout')),
  category     VARCHAR(20) CHECK (category IN ('sickness','funeral','emergency','other')),
  notes        TEXT,
  date         DATE NOT NULL DEFAULT CURRENT_DATE,
  recorded_by  INT NOT NULL REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS meetings (
  id            SERIAL PRIMARY KEY,
  cycle_id      INT REFERENCES cycles(id) ON DELETE SET NULL,
  meeting_date  DATE NOT NULL,
  meeting_time  VARCHAR(10),
  location      VARCHAR(160),
  agenda        TEXT,
  notes         TEXT,
  recorded_by   INT NOT NULL REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance (
  id          SERIAL PRIMARY KEY,
  meeting_id  INT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  member_id   INT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  status      VARCHAR(10) NOT NULL DEFAULT 'present' CHECK (status IN ('present','absent','excused')),
  UNIQUE (meeting_id, member_id)
);

CREATE TABLE IF NOT EXISTS share_out (
  id                SERIAL PRIMARY KEY,
  cycle_id          INT REFERENCES cycles(id) ON DELETE SET NULL,
  total_savings     NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_interest    NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_fines       NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_welfare     NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_fund        NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_members     INT NOT NULL DEFAULT 0,
  status            VARCHAR(12) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','distributed')),
  date_distributed  DATE,
  distributed_by    INT REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One line per member per share-out, so we can show and text each woman her own figure.
CREATE TABLE IF NOT EXISTS share_out_details (
  id              SERIAL PRIMARY KEY,
  share_out_id    INT NOT NULL REFERENCES share_out(id) ON DELETE CASCADE,
  member_id       INT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  member_savings  NUMERIC(12,2) NOT NULL DEFAULT 0,
  profit_share    NUMERIC(12,2) NOT NULL DEFAULT 0,
  deductions      NUMERIC(12,2) NOT NULL DEFAULT 0,
  share_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
  notified        BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (share_out_id, member_id)
);

-- Women apply to join; the group votes; a committee member finalises.
CREATE TABLE IF NOT EXISTS join_requests (
  id            SERIAL PRIMARY KEY,
  full_name     VARCHAR(120) NOT NULL,
  phone         VARCHAR(20) NOT NULL,
  village       VARCHAR(120),
  reason        TEXT,
  status        VARCHAR(12) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  decided_by    INT REFERENCES users(id),
  decided_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS join_request_votes (
  id          SERIAL PRIMARY KEY,
  request_id  INT NOT NULL REFERENCES join_requests(id) ON DELETE CASCADE,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vote        VARCHAR(7) NOT NULL CHECK (vote IN ('yes','no')),
  comment     TEXT,
  voted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (request_id, user_id)
);

CREATE TABLE IF NOT EXISTS sms_notifications (
  id               SERIAL PRIMARY KEY,
  recipient_phone  VARCHAR(20) NOT NULL,
  recipient_name   VARCHAR(120),
  message          TEXT NOT NULL,
  category         VARCHAR(30) NOT NULL DEFAULT 'general',
  is_broadcast     BOOLEAN NOT NULL DEFAULT FALSE,
  status           VARCHAR(10) NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','failed','skipped')),
  error            TEXT,
  sent_by          INT REFERENCES users(id),
  sent_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One-time codes for the SMS password reset.
CREATE TABLE IF NOT EXISTS password_resets (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash   VARCHAR(255) NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  used        BOOLEAN NOT NULL DEFAULT FALSE,
  attempts    INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id           SERIAL PRIMARY KEY,
  user_id      INT REFERENCES users(id) ON DELETE SET NULL,
  action       VARCHAR(60) NOT NULL,
  entity_type  VARCHAR(40),
  entity_id    INT,
  details      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settings (
  setting_key    VARCHAR(60) PRIMARY KEY,
  setting_value  TEXT NOT NULL,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_savings_member ON savings(member_id);
CREATE INDEX IF NOT EXISTS idx_savings_cycle  ON savings(cycle_id);
CREATE INDEX IF NOT EXISTS idx_loans_member   ON loans(member_id);
CREATE INDEX IF NOT EXISTS idx_loans_status   ON loans(status);
CREATE INDEX IF NOT EXISTS idx_repay_loan     ON loan_repayments(loan_id);
CREATE INDEX IF NOT EXISTS idx_sms_sent_at    ON sms_notifications(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_created  ON audit_logs(created_at DESC);
