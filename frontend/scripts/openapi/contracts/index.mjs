import { adminLoginContract, adminMeContract } from './admin-auth.mjs';
import { companyLoginContract, companyMeContract } from './company-auth.mjs';
import { listOrdersContract, createOrderContract } from './company-orders.mjs';
import { listQuotationsContract, createQuotationContract } from './company-quotations.mjs';

export const openapiContracts = [
  adminLoginContract,
  adminMeContract,
  companyLoginContract,
  companyMeContract,
  listOrdersContract,
  createOrderContract,
  listQuotationsContract,
  createQuotationContract,
];
