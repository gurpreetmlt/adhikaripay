-- AEPS rail service rows (idempotent). These are backend routing rows keyed by
-- executeServiceTxn serviceCode — NOT catalog tiles (tiles use CASH_DEPOSIT etc.).
-- They live under an INACTIVE category so getCatalog never renders them, while the
-- service rows themselves stay active for provider routing.
-- max_amount is mandatory for money-moving services (assertAmountWithinLimits fails closed).
INSERT INTO "service_categories" ("code", "name", "display_order", "is_active")
SELECT 'AEPS_RAILS', 'AEPS Rails (internal)', 999, false
WHERE NOT EXISTS (SELECT 1 FROM "service_categories" WHERE "code" = 'AEPS_RAILS');
--> statement-breakpoint
INSERT INTO "services" ("category_id", "code", "name", "max_amount", "display_order", "is_active")
SELECT c."id", v."code", v."name", v."max_amount", 999, true
FROM "service_categories" c
CROSS JOIN (
  VALUES
    ('aeps_cash_withdrawal', 'AEPS Cash Withdrawal', 10000.00),
    ('aeps_cash_deposit',    'AEPS Cash Deposit',    50000.00),
    ('aeps_balance_enquiry', 'AEPS Balance Enquiry', NULL::numeric),
    ('aeps_mini_statement',  'AEPS Mini Statement',  NULL::numeric),
    ('aadhaar_pay',          'Aadhaar Pay',          10000.00)
) AS v("code", "name", "max_amount")
WHERE c."code" = 'AEPS_RAILS'
  AND NOT EXISTS (SELECT 1 FROM "services" s WHERE s."code" = v."code");
