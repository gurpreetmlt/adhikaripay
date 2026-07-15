import { Router } from "express";
import { getCatalog } from "./catalog.service";
import { requireAuth } from "../../middleware/auth.middleware";
import { sendSuccess } from "../../utils/apiResponse";

export const catalogRouter = Router();

catalogRouter.get("/", requireAuth, async (_req, res) => {
  try {
    const catalog = await getCatalog();
    sendSuccess(res, catalog);
  } catch (err) {
    console.error("[CATALOG] getCatalog failed:", err);
    res.status(500).json({ success: false, message: "Failed to load catalog" });
  }
});
