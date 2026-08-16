-- RiskGPT owns this private schema. It is intentionally separate from the
-- existing V-SECURE schemas and is not a Supabase Data API surface.
create schema if not exists risk;

revoke all on schema risk from public, anon, authenticated;
grant usage on schema risk to service_role;

alter default privileges in schema risk revoke all on tables from public, anon, authenticated;
alter default privileges in schema risk revoke all on sequences from public, anon, authenticated;

create table risk.assessment_cases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  external_reference text,
  status text not null default 'draft' check (status in ('draft', 'in_review', 'finalized', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, external_reference)
);

create table risk.business_subjects (
  id uuid primary key default gen_random_uuid(),
  assessment_case_id uuid not null references risk.assessment_cases(id) on delete cascade,
  subject_type text not null check (subject_type in ('organization', 'individual', 'counterparty')),
  legal_name text not null,
  jurisdiction text,
  identifiers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table risk.source_documents (
  id uuid primary key default gen_random_uuid(),
  assessment_case_id uuid not null references risk.assessment_cases(id) on delete cascade,
  document_type text not null,
  storage_reference text not null,
  content_hash text not null,
  source_metadata jsonb not null default '{}'::jsonb,
  ingested_at timestamptz not null default now(),
  unique (assessment_case_id, content_hash)
);

create table risk.financial_statements (
  id uuid primary key default gen_random_uuid(),
  assessment_case_id uuid not null references risk.assessment_cases(id) on delete cascade,
  source_document_id uuid references risk.source_documents(id) on delete set null,
  statement_type text not null check (statement_type in ('balance_sheet', 'income_statement', 'cash_flow')),
  reporting_period_start date not null,
  reporting_period_end date not null check (reporting_period_end >= reporting_period_start),
  currency_code char(3) not null,
  values jsonb not null,
  created_at timestamptz not null default now(),
  unique (assessment_case_id, statement_type, reporting_period_end)
);

create table risk.metrics (
  id uuid primary key default gen_random_uuid(),
  assessment_case_id uuid not null references risk.assessment_cases(id) on delete cascade,
  financial_statement_id uuid references risk.financial_statements(id) on delete set null,
  metric_key text not null,
  metric_value numeric not null,
  calculation_version text not null,
  inputs_hash text not null,
  calculated_at timestamptz not null default now(),
  unique (assessment_case_id, metric_key, calculation_version, inputs_hash)
);

create table risk.assessments (
  id uuid primary key default gen_random_uuid(),
  assessment_case_id uuid not null references risk.assessment_cases(id) on delete cascade,
  scoring_version text not null,
  score numeric not null,
  rating text not null,
  explanation jsonb not null default '{}'::jsonb,
  assessed_at timestamptz not null default now()
);

create table risk.triggered_rules (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references risk.assessments(id) on delete cascade,
  rule_key text not null,
  rule_version text not null,
  outcome text not null check (outcome in ('triggered', 'not_triggered', 'suppressed')),
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (assessment_id, rule_key, rule_version)
);

create table risk.analyst_reviews (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references risk.assessments(id) on delete cascade,
  reviewer_id uuid not null,
  disposition text not null check (disposition in ('approved', 'rejected', 'needs_information')),
  rationale text not null,
  reviewed_at timestamptz not null default now()
);

create table risk.audit_events (
  id uuid primary key default gen_random_uuid(),
  assessment_case_id uuid not null references risk.assessment_cases(id) on delete restrict,
  actor_id uuid,
  event_type text not null,
  event_payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index risk_assessment_cases_organization_idx on risk.assessment_cases (organization_id, created_at desc);
create index risk_business_subjects_case_idx on risk.business_subjects (assessment_case_id);
create index risk_source_documents_case_idx on risk.source_documents (assessment_case_id);
create index risk_financial_statements_case_idx on risk.financial_statements (assessment_case_id, reporting_period_end desc);
create index risk_metrics_case_key_idx on risk.metrics (assessment_case_id, metric_key);
create index risk_assessments_case_idx on risk.assessments (assessment_case_id, assessed_at desc);
create index risk_triggered_rules_assessment_idx on risk.triggered_rules (assessment_id);
create index risk_analyst_reviews_assessment_idx on risk.analyst_reviews (assessment_id, reviewed_at desc);
create index risk_audit_events_case_idx on risk.audit_events (assessment_case_id, occurred_at desc);

alter table risk.assessment_cases enable row level security;
alter table risk.business_subjects enable row level security;
alter table risk.source_documents enable row level security;
alter table risk.financial_statements enable row level security;
alter table risk.metrics enable row level security;
alter table risk.assessments enable row level security;
alter table risk.triggered_rules enable row level security;
alter table risk.analyst_reviews enable row level security;
alter table risk.audit_events enable row level security;

-- No anon/authenticated policies are created. Access will be introduced through
-- explicit service interfaces in later RiskGPT delivery items.
