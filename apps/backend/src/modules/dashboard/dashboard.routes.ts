import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { sendSuccess } from "../../utils/apiResponse";
import { HttpError } from "../../utils/httpError";
import { getDashboardStats } from "./dashboard.service";

export const dashboardRouter = Router();

dashboardRouter.get("/stats", requireAuth, async (req, res) => {
  if (!req.auth) throw new HttpError(401, "Authentication required", "UNAUTHENTICATED");
  const stats = await getDashboardStats(req.auth.sub, req.auth.role);
  sendSuccess(res, stats);
});
