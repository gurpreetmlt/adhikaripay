import type { Request, Response } from "express";
import { sendSuccess } from "../../utils/apiResponse";
import {
  signupMinKyc,
  getOnboardingStatus,
  biometricKycStatus,
  submitBiometricKyc,
  mobileChangeInitiate,
  mobileChangeVerify,
  merchantList,
} from "./onboarding.service";
import type {
  BioKycStatusInput,
  BioKycSubmitInput,
  MerchantListInput,
  MinKycSignupInput,
  MobileChangeInitiateInput,
  MobileChangeVerifyInput,
} from "./onboarding.validators";

export async function instantpaySignup(req: Request, res: Response): Promise<void> {
  const body = req.body as MinKycSignupInput;
  const profile = await signupMinKyc(req.auth!.sub, body, req.ip ?? "127.0.0.1");
  sendSuccess(res, profile);
}

export async function instantpayStatus(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await getOnboardingStatus(req.auth!.sub));
}

export async function instantpayBioKycStatus(req: Request, res: Response): Promise<void> {
  const body = req.body as BioKycStatusInput;
  sendSuccess(res, await biometricKycStatus(req.auth!.sub, body.spKey, req.ip ?? "127.0.0.1"));
}

export async function instantpayBioKycSubmit(req: Request, res: Response): Promise<void> {
  const body = req.body as BioKycSubmitInput;
  sendSuccess(res, await submitBiometricKyc(req.auth!.sub, body, req.ip ?? "127.0.0.1"));
}

export async function instantpayMobileChangeInitiate(req: Request, res: Response): Promise<void> {
  const body = req.body as MobileChangeInitiateInput;
  sendSuccess(res, await mobileChangeInitiate(req.auth!.sub, body, req.ip ?? "127.0.0.1"));
}

export async function instantpayMobileChangeVerify(req: Request, res: Response): Promise<void> {
  const body = req.body as MobileChangeVerifyInput;
  sendSuccess(res, await mobileChangeVerify(req.auth!.sub, body, req.ip ?? "127.0.0.1"));
}

export async function instantpayMerchantList(req: Request, res: Response): Promise<void> {
  const body = req.body as MerchantListInput;
  sendSuccess(res, await merchantList(body, req.ip ?? "127.0.0.1"));
}
