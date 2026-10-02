import { Router, type IRouter } from "express";
import healthRouter from "./health";
import aiRouter from "./ai";
import rewardedAdsRouter from "./rewardedAds";
import notificationsRouter from "./notifications";

const router: IRouter = Router();

router.use(healthRouter);
router.use(aiRouter);
router.use(rewardedAdsRouter);
router.use(notificationsRouter);

export default router;
