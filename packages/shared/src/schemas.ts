import { z } from "zod";
import { agreementTypes, devicePlatforms, paymentMethods, deviceControlModes } from "./statuses";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const createCustomerSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(8),
  address: z.string().optional(),
  riskScore: z.coerce.number().int().min(0).max(100).default(0),
});

export const createDeviceSchema = z.object({
  brand: z.string().min(1),
  model: z.string().min(1),
  imei: z.string().optional(),
  serialNumber: z.string().optional(),
  storage: z.string().optional(),
  color: z.string().optional(),
  platform: z.enum(devicePlatforms),
  notes: z.string().optional(),
  controlMode: z.enum(deviceControlModes).default("NONE"),
  icloudAppleIdAlias: z.string().optional(),
  icloudFindMyStatus: z.enum(["UNKNOWN", "ON", "OFF"]).optional(),
  icloudActivationStatus: z.enum(["UNKNOWN", "ON", "OFF"]).optional(),
});

export const createContractSchema = z.object({
  customerId: z.string().min(1),
  deviceId: z.string().min(1),
  salePrice: z.coerce.number().positive(),
  downPayment: z.coerce.number().min(0),
  interestAmount: z.coerce.number().min(0).default(0),
  installmentCount: z.coerce.number().int().positive(),
  firstDueDate: z.string().min(8),
  agreementType: z.enum(agreementTypes).default("LEASE_TO_OWN"),
  managementPurpose: z.string().default("LEASE_TO_OWN_ASSET_PROTECTION"),
});

export const createPaymentSchema = z.object({
  contractId: z.string().min(1),
  installmentId: z.string().optional(),
  amount: z.coerce.number().positive(),
  method: z.enum(paymentMethods).default("BANK_TRANSFER"),
  slipUrl: z.string().optional(),
  note: z.string().optional(),
});

export const portalLookupSchema = z.object({
  phone: z.string().min(8),
});
