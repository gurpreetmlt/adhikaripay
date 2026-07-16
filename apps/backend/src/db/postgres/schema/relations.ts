import { relations } from "drizzle-orm";
import { users, refreshTokens } from "./users";
import { devices } from "./devices";
import { wallets, walletLedgerGroups, walletLedgerEntries } from "./wallets";
import { serviceCategories, services, providers, providerServices } from "./catalog";
import { transactions } from "./transactions";
import { commissionRules, commissionLedger, userCommissionRates } from "./commission";
import { apiClients, apiIpWhitelist } from "./apiClients";

export const usersRelations = relations(users, ({ one, many }) => ({
  parent: one(users, { fields: [users.parentId], references: [users.id] }),
  wallets: many(wallets),
  transactions: many(transactions),
  refreshTokens: many(refreshTokens),
  devices: many(devices),
  apiClients: many(apiClients),
  commissionRates: many(userCommissionRates),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, { fields: [refreshTokens.userId], references: [users.id] }),
}));

export const devicesRelations = relations(devices, ({ one }) => ({
  user: one(users, { fields: [devices.userId], references: [users.id] }),
}));

export const walletsRelations = relations(wallets, ({ one, many }) => ({
  user: one(users, { fields: [wallets.userId], references: [users.id] }),
  ledgerEntries: many(walletLedgerEntries),
}));

export const walletLedgerGroupsRelations = relations(walletLedgerGroups, ({ many }) => ({
  entries: many(walletLedgerEntries),
}));

export const walletLedgerEntriesRelations = relations(walletLedgerEntries, ({ one }) => ({
  group: one(walletLedgerGroups, {
    fields: [walletLedgerEntries.groupId],
    references: [walletLedgerGroups.id],
  }),
  wallet: one(wallets, { fields: [walletLedgerEntries.walletId], references: [wallets.id] }),
}));

export const serviceCategoriesRelations = relations(serviceCategories, ({ many }) => ({
  services: many(services),
}));

export const servicesRelations = relations(services, ({ one, many }) => ({
  category: one(serviceCategories, { fields: [services.categoryId], references: [serviceCategories.id] }),
  providerServices: many(providerServices),
  commissionRules: many(commissionRules),
  userCommissionRates: many(userCommissionRates),
}));

export const userCommissionRatesRelations = relations(userCommissionRates, ({ one }) => ({
  user: one(users, { fields: [userCommissionRates.userId], references: [users.id] }),
  service: one(services, { fields: [userCommissionRates.serviceId], references: [services.id] }),
}));

export const providersRelations = relations(providers, ({ many }) => ({
  providerServices: many(providerServices),
}));

export const providerServicesRelations = relations(providerServices, ({ one }) => ({
  service: one(services, { fields: [providerServices.serviceId], references: [services.id] }),
  provider: one(providers, { fields: [providerServices.providerId], references: [providers.id] }),
}));

export const transactionsRelations = relations(transactions, ({ one, many }) => ({
  user: one(users, { fields: [transactions.userId], references: [users.id] }),
  service: one(services, { fields: [transactions.serviceId], references: [services.id] }),
  provider: one(providers, { fields: [transactions.providerId], references: [providers.id] }),
  commissionEntries: many(commissionLedger),
}));

export const commissionRulesRelations = relations(commissionRules, ({ one }) => ({
  service: one(services, { fields: [commissionRules.serviceId], references: [services.id] }),
}));

export const commissionLedgerRelations = relations(commissionLedger, ({ one }) => ({
  transaction: one(transactions, { fields: [commissionLedger.transactionId], references: [transactions.id] }),
  beneficiary: one(users, { fields: [commissionLedger.beneficiaryUserId], references: [users.id] }),
  ledgerGroup: one(walletLedgerGroups, {
    fields: [commissionLedger.ledgerGroupId],
    references: [walletLedgerGroups.id],
  }),
}));

export const apiClientsRelations = relations(apiClients, ({ one, many }) => ({
  owner: one(users, { fields: [apiClients.ownerUserId], references: [users.id] }),
  ipWhitelist: many(apiIpWhitelist),
}));

export const apiIpWhitelistRelations = relations(apiIpWhitelist, ({ one }) => ({
  client: one(apiClients, { fields: [apiIpWhitelist.apiClientId], references: [apiClients.id] }),
}));
