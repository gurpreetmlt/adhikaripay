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

const CATALOG: { code: string; name: string; icon: string; services: SeedService[] }[] = [
  {
    code: "BANKING_SERVICES",
    name: "Banking Services",
    icon: "landmark",
    services: [
      { code: "CASH_WITHDRAW", name: "Cash Withdraw", icon: "Aeps.svg" },
      { code: "MINI_STATEMENT", name: "Mini Statement", icon: "Aeps.svg" },
      { code: "CASH_DEPOSIT", name: "Cash Deposit", icon: "Aeps.svg" },
      { code: "BALANCE_ENQUIRY", name: "Balance Enquiry", icon: "Aeps.svg" },
      { code: "UPI_CASH_POINT", name: "UPI Cash Point", badge: "NEW" },
      { code: "MONEY_TRANSFER", name: "Money Transfer", icon: "money_transfer.svg" },
    ],
  },
  {
    code: "RECHARGE_AND_BILLS",
    name: "Recharges and Bills",
    icon: "receipt",
    services: [
      { code: "MOBILE_PREPAID", name: "Mobile Prepaid", badge: "Upto 2%", icon: "bill_payments-new.svg" },
      { code: "LOAN_REPAYMENT", name: "Loan Repayment", badge: "Flat 0.15%", icon: "loan_serviceLogo.svg" },
      { code: "ELECTRICITY", name: "Electricity", badge: "Flat ₹1" },
      { code: "DTH", name: "DTH", badge: "Upto 1.50%", icon: "DTH_Web.svg" },
      { code: "AGENT_COLLECTION", name: "Agent Collection", badge: "Flat 0.11%", icon: "AgentCollection_Web.svg" },
      { code: "CASH_COLLECTION", name: "Cash Collection", icon: "cash_collection.svg" },
      { code: "LOANS", name: "Loans", icon: "loan_serviceLogo.svg" },
      { code: "INSURANCE", name: "Insurance", icon: "poorna_suraksha.svg" },
      { code: "CREDIT_CARDS", name: "Credit Cards", icon: "apply-credit-card.svg" },
      { code: "CREDIT_CARD_BILL", name: "Credit Card", badge: "Flat ₹0.5", icon: "credit_card.svg" },
      { code: "FASTAG_RECHARGE", name: "Fastag Recharge", badge: "Flat 0.15%", icon: "FleetCard_Web.svg" },
      { code: "MOBILE_POSTPAID", name: "Mobile Postpaid", badge: "Flat ₹2", icon: "Postpaid_Web.svg" },
      { code: "WATER", name: "Water", badge: "Flat ₹1" },
      { code: "LANDLINE_POSTPAID", name: "Landline Postpaid", badge: "Flat ₹2", icon: "Postpaid_Web.svg" },
      { code: "GAS_PIPELINE", name: "Gas Pipeline", badge: "Flat ₹1" },
      { code: "INSURANCE_PREMIUM", name: "Insurance Premium", badge: "Upto ₹5", icon: "poorna_suraksha.svg" },
      { code: "BROADBAND_POSTPAID", name: "Broadband Postpaid", badge: "Flat ₹2", icon: "Postpaid_Web.svg" },
      { code: "SUBSCRIPTION", name: "Subscription", badge: "Flat 0.25%" },
      { code: "EDUCATION_FEES", name: "Education Fees", badge: "Upto ₹4.75" },
      { code: "LPG_CYLINDER", name: "LPG Cylinder", badge: "Flat ₹1" },
      { code: "MUNICIPAL_TAXES", name: "Municipal Taxes", badge: "Upto ₹2.5", icon: "Municipal_Taxes_Web.svg" },
      { code: "ECHALLAN", name: "eChallan", badge: "Flat ₹0.5", icon: "eChallan_Web.svg" },
      { code: "CABLE_TV", name: "Cable TV", badge: "Flat ₹2", icon: "CableTV_Web.svg" },
      { code: "DONATION", name: "Donation", badge: "Flat ₹1", icon: "Donation_Web.svg" },
      { code: "MUNICIPAL_SERVICES", name: "Municipal Services", badge: "Upto ₹2.5", icon: "Municipal_Taxes_Web.svg" },
      { code: "PREPAID_METER", name: "Prepaid Meter", badge: "Flat ₹0.20", icon: "PrepaidMeter_Web.svg" },
      { code: "NCMC_RECHARGE", name: "NCMC Recharge", badge: "Flat ₹2", icon: "NCMC_Web.svg" },
      { code: "FLEET_CARD_RECHARGE", name: "Fleet Card Recharge", badge: "Flat 0.25%", icon: "FleetCard_Web.svg" },
      { code: "EV_RECHARGE", name: "EV Recharge", badge: "Upto ₹5", icon: "EVRecharge_Web.svg" },
      { code: "HOUSING_SOCIETY", name: "Housing Society", badge: "Upto ₹5", icon: "Clubs_and_Associations_Web.svg" },
      { code: "LIC", name: "LIC", icon: "ic_LIC.svg" },
      { code: "RENTAL", name: "Rental", badge: "Upto ₹5", icon: "Rental_Web.svg" },
      { code: "CLUBS_AND_ASSOCIATIONS", name: "Clubs and Associations", badge: "Upto ₹5", icon: "Clubs_and_Associations_Web.svg" },
      { code: "LIC_SUVIDHA", name: "LIC Suvidha", icon: "ic_LIC.svg" },
    ],
  },
  {
    code: "ACCEPT_PAYMENTS",
    name: "Accept Payments",
    icon: "fingerprint",
    services: [{ code: "AADHAAR_PAY", name: "Aadhaar Pay", icon: "adharPay.svg" }],
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
      { code: "SHG_WITHDRAW_CASH", name: "Withdraw Cash" },
      { code: "SHG_DEPOSIT_CASH", name: "Deposit Cash" },
    ],
  },
];

async function main() {
  for (const [categoryIndex, category] of CATALOG.entries()) {
    const [existingCategory] = await db
      .select({ id: serviceCategories.id })
      .from(serviceCategories)
      .where(eq(serviceCategories.code, category.code));

    const categoryId =
      existingCategory?.id ??
      (
        await db
          .insert(serviceCategories)
          .values({
            code: category.code,
            name: category.name,
            icon: category.icon,
            displayOrder: categoryIndex,
          })
          .returning({ id: serviceCategories.id })
      )[0]?.id;

    if (!categoryId) throw new Error(`Failed to create category ${category.code}`);

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

  console.log(`Seeded ${CATALOG.length} categories and ${CATALOG.reduce((n, c) => n + c.services.length, 0)} services.`);
  await pgPool.end();
}

main().catch((err) => {
  console.error("Seeding catalog failed:", err);
  process.exit(1);
});
