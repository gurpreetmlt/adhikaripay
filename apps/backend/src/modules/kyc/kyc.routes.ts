import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { sendSuccess } from "../../utils/apiResponse";
import { HttpError } from "../../utils/httpError";
import { kycSubmitSchema } from "../auth/auth.validators";
import { submitKyc } from "./kyc.service";

export const kycRouter = Router();

kycRouter.use(requireAuth);

kycRouter.post("/submit", async (req, res) => {
  if (!req.auth) throw new HttpError(401, "Authentication required", "UNAUTHENTICATED");
  const input = kycSubmitSchema.parse(req.body);
  const user = await submitKyc(req.auth.sub, input);
  sendSuccess(res, { user }, "KYC submitted successfully");
});
