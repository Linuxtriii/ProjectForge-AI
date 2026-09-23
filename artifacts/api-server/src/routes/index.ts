import { Router, type IRouter } from "express";
import healthRouter from "./health";
import aiRouter from "./ai";
import generationRouter from "./generation";

const router: IRouter = Router();

router.use(healthRouter);
router.use(aiRouter);
router.use(generationRouter);

export default router;
