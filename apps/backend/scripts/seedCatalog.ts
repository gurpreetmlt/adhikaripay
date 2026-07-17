import "dotenv/config";
import { eq } from "drizzle-orm";
import { db, pgPool } from "../src/db/postgres";
import { serviceCategories, services } from "../src/db/postgres/schema";

interface SeedService {
  code: string;
  name: string;
  badge?: string;
  icon?: string;
}

interface SeedCategory {
  code: string;
  name: string;
  icon: string;
  /** Older category code to rename in place (avoids orphan rows). */
  migrateFrom?: string;
  services: SeedService[];
}

/**
 * Dashboard layout:
 *   1) Banking Services — AEPS / DMT / UPI (not BBPS)
 *   2) Bill Payment (BBPS) — every NPCI BBPS-style biller we support
 *   3) Accept Payments — Aadhaar Pay
 *   4) More Services — non-BBPS products (loans apply, collections, etc.)
 *   5) Govt. / SHG
 *
 * Icon files: `Icons/` + `apps/web/public/service-icons/`.
 */
const CATALOG: SeedCategory[] = [
  {
    code: "BANKING_SERVICES",
    name: "Banking Services",
    icon: "landmark",
    services: [
      { code: "CASH_WITHDRAW", name: "Cash Withdraw", icon: "micro_atm_withdrawal.svg" },
      { code: "MINI_STATEMENT", name: "Mini Statement", icon: "Postpaid_Web.svg" },
      { code: "CASH_DEPOSIT", name: "Cash Deposit", icon: "ic_recurring_deposit.png" },
      { code: "BALANCE_ENQUIRY", name: "Balance Enquiry", icon: "credit-score-icon.svg" },
      { code: "UPI_CASH_POINT", name: "UPI Cash Point", badge: "NEW" },
      { code: "MONEY_TRANSFER", name: "Money Transfer", icon: "money_transfer.svg" },
    ],
  },
  {
    code: "BILL_PAYMENT_BBPS",
    name: "Bill Payment (BBPS)",
    icon: "receipt",
    migrateFrom: "RECHARGE_AND_BILLS",
    services: [
      // Telecom & entertainment
      { code: "MOBILE_PREPAID", name: "Mobile Prepaid", badge: "Upto 2%", icon: "MobilePrepaid_Web.png" },
      { code: "MOBILE_POSTPAID", name: "Mobile Postpaid", badge: "Flat ₹2", icon: "ic_other_bills.svg" },
      { code: "DTH", name: "DTH", badge: "Upto 1.50%", icon: "DTH_Web.svg" },
      { code: "CABLE_TV", name: "Cable TV", badge: "Flat ₹2", icon: "CableTV_Web.svg" },
      { code: "LANDLINE_POSTPAID", name: "Landline Postpaid", badge: "Flat ₹2", icon: "ic_other_bills.svg" },
      { code: "BROADBAND_POSTPAID", name: "Broadband Postpaid", badge: "Flat ₹2", icon: "ic_other_bills.svg" },
      // Utilities
      { code: "ELECTRICITY", name: "Electricity", badge: "Flat ₹1", icon: "ic_electric.png" },
      { code: "WATER", name: "Water", badge: "Flat ₹1", icon: "ic_water.png" },
      { code: "GAS_PIPELINE", name: "Gas Pipeline", badge: "Flat ₹1", icon: "ic_gas_pipeline.png" },
      { code: "LPG_CYLINDER", name: "LPG Cylinder", badge: "Flat ₹1", icon: "ic_lpg_gas_booking.png" },
      { code: "PREPAID_METER", name: "Prepaid Meter", badge: "Flat ₹0.20", icon: "PrepaidMeter_Web.svg" },
      // Mobility
      { code: "FASTAG_RECHARGE", name: "FASTag Recharge", badge: "Flat 0.15%", icon: "ic_fastag.png" },
      { code: "NCMC_RECHARGE", name: "NCMC Recharge", badge: "Flat ₹2", icon: "NCMC_Web.svg" },
      { code: "FLEET_CARD_RECHARGE", name: "Fleet Card", badge: "Flat 0.25%", icon: "FleetCard_Web.svg" },
      { code: "EV_RECHARGE", name: "EV Recharge", badge: "Upto ₹5", icon: "EVRecharge_Web.svg" },
      // Finance bills
      { code: "CREDIT_CARD_BILL", name: "Credit Card Bill", badge: "Flat ₹0.5", icon: "credit_card.svg" },
      { code: "LOAN_REPAYMENT", name: "Loan Repayment", badge: "Flat 0.15%", icon: "ic_loan.png" },
      { code: "INSURANCE_PREMIUM", name: "Insurance Premium", badge: "Upto ₹5", icon: "poorna_suraksha.svg" },
      { code: "LIC", name: "LIC", icon: "ic_LIC.svg" },
      { code: "LIC_SUVIDHA", name: "LIC Suvidha", icon: "ic_LIC.svg" },
      { code: "NPS", name: "NPS", badge: "NEW", icon: "NPS_Web.svg" },
      // Civic / education / society
      { code: "EDUCATION_FEES", name: "Education Fees", badge: "Upto ₹4.75", icon: "ic_education_fees.png" },
      { code: "MUNICIPAL_TAXES", name: "Municipal Taxes", badge: "Upto ₹2.5", icon: "ic_municipal_taxes.png" },
      { code: "MUNICIPAL_SERVICES", name: "Municipal Services", badge: "Upto ₹2.5", icon: "Municipal_Taxes_Web.svg" },
      { code: "HOUSING_SOCIETY", name: "Housing Society", badge: "Upto ₹5", icon: "ic_housing_society.png" },
      { code: "CLUBS_AND_ASSOCIATIONS", name: "Clubs & Associations", badge: "Upto ₹5", icon: "Clubs_and_Associations_Web.svg" },
      { code: "RENTAL", name: "Rental", badge: "Upto ₹5", icon: "Rental_Web.svg" },
      { code: "ECHALLAN", name: "eChallan", badge: "Flat ₹0.5", icon: "eChallan_Web.svg" },
      { code: "DONATION", name: "Donation", badge: "Flat ₹1", icon: "Donation_Web.svg" },
      { code: "SUBSCRIPTION", name: "Subscription", badge: "Flat 0.25%", icon: "ic_subscription_fees.png" },
    ],
  },
  {
    code: "ACCEPT_PAYMENTS",
    name: "Accept Payments",
    icon: "fingerprint",
    services: [{ code: "AADHAAR_PAY", name: "Aadhaar Pay", icon: "adharPay.svg" }],
  },
  {
    code: "MORE_SERVICES",
    name: "More Services",
    icon: "grid",
    services: [
      { code: "AGENT_COLLECTION", name: "Agent Collection", badge: "Flat 0.11%", icon: "AgentCollection_Web.svg" },
      { code: "CASH_COLLECTION", name: "Cash Collection", icon: "cash_collection.svg" },
      { code: "LOANS", name: "Loans", icon: "loan_serviceLogo.svg" },
      { code: "INSURANCE", name: "Insurance", icon: "poorna_suraksha.svg" },
      { code: "CREDIT_CARDS", name: "Apply Credit Card", icon: "apply-credit-card.svg" },
    ],
  },
  {
    code: "GOVT_SERVICES",
    name: "Govt. Services",
    icon: "building-2",
    services: [{ code: "APPLY_EPAN", name: "Apply ePAN", icon: "pan_card.svg" }],
  },
  {
    code: "SHG_SERVICES",
    name: "SHG Services",
    icon: "users",
    services: [
      { code: "SHG_WITHDRAW_CASH", name: "Withdraw Cash", icon: "micro_atm_withdrawal.svg" },
      { code: "SHG_DEPOSIT_CASH", name: "Deposit Cash", icon: "cash_collection.svg" },
    ],
  },
];

async function upsertCategory(
  category: SeedCategory,
  displayOrder: number,
): Promise<string> {
  const [byNewCode] = await db
    .select({ id: serviceCategories.id })
    .from(serviceCategories)
    .where(eq(serviceCategories.code, category.code));

  if (byNewCode) {
    await db
      .update(serviceCategories)
      .set({
        name: category.name,
        icon: category.icon,
        displayOrder,
      })
      .where(eq(serviceCategories.id, byNewCode.id));
    return byNewCode.id;
  }

  if (category.migrateFrom) {
    const [legacy] = await db
      .select({ id: serviceCategories.id })
      .from(serviceCategories)
      .where(eq(serviceCategories.code, category.migrateFrom));

    if (legacy) {
      await db
        .update(serviceCategories)
        .set({
          code: category.code,
          name: category.name,
          icon: category.icon,
          displayOrder,
        })
        .where(eq(serviceCategories.id, legacy.id));
      return legacy.id;
    }
  }

  const [created] = await db
    .insert(serviceCategories)
    .values({
      code: category.code,
      name: category.name,
      icon: category.icon,
      displayOrder,
    })
    .returning({ id: serviceCategories.id });

  if (!created) throw new Error(`Failed to create category ${category.code}`);
  return created.id;
}

async function main() {
  for (const [categoryIndex, category] of CATALOG.entries()) {
    const categoryId = await upsertCategory(category, categoryIndex);

    for (const [serviceIndex, service] of category.services.entries()) {
      const [existingService] = await db
        .select({ id: services.id })
        .from(services)
        .where(eq(services.code, service.code));

      if (existingService) {
        await db
          .update(services)
          .set({
            categoryId,
            name: service.name,
            badge: service.badge ?? null,
            icon: service.icon ?? null,
            displayOrder: serviceIndex,
          })
          .where(eq(services.id, existingService.id));
        continue;
      }

      await db.insert(services).values({
        categoryId,
        code: service.code,
        name: service.name,
        badge: service.badge ?? null,
        icon: service.icon ?? null,
        displayOrder: serviceIndex,
      });
    }
  }

  console.log(
    `Seeded ${CATALOG.length} categories and ${CATALOG.reduce((n, c) => n + c.services.length, 0)} services.`,
  );
  await pgPool.end();
}

main().catch((err) => {
  console.error("Seeding catalog failed:", err);
  process.exit(1);
});
