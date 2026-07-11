import { Router, type IRouter } from "express";
import healthRouter from "./health";
import menuRouter from "./menu";
import ordersRouter from "./orders";
import settingsRouter from "./settings";
import authRouter from "./auth";
import receptionistsRouter from "./receptionists";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

// Public routes
router.use(authRouter);
router.use(healthRouter);

// Protected routes — require a valid session
router.use(requireAuth);
router.use(menuRouter);
router.use(ordersRouter);
router.use(settingsRouter);
router.use(receptionistsRouter);

export default router;
