import { Router } from "express";
import { getDownline, getNetwork } from "./users.service";
import { requireAuth } from "../../middleware/auth.middleware";
import { sendSuccess } from "../../utils/apiResponse";
import { HttpError } from "../../utils/httpError";

export const usersRouter = Router();

usersRouter.get("/downline", requireAuth, async (req, res) => {
  if (!req.auth) throw new HttpError(401, "Authentication required", "UNAUTHENTICATED");
  const downline = await getDownline(req.auth.sub);
  sendSuccess(res, downline);
});

usersRouter.get("/network", requireAuth, async (req, res) => {
  if (!req.auth) throw new HttpError(401, "Authentication required", "UNAUTHENTICATED");
  const network = await getNetwork(req.auth.sub, req.auth.role);
  sendSuccess(res, network);
});
