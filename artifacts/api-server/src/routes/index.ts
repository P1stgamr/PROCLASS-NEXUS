import { Router, type IRouter } from "express";
import healthRouter from "./health";
import aiRouter from "./ai";
import rewardedAdsRouter from "./rewardedAds";

const router: IRouter = Router();

router.use(healthRouter);
router.use(aiRouter);
router.use(rewardedAdsRouter);

export default router;
