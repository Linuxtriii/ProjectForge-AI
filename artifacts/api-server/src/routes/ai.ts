import { Router, type IRouter } from "express";
import { GetAiModelsResponse, GetAiStatusResponse } from "@workspace/api-zod";
import { getAiSnapshot } from "../services/project-generator";

const router: IRouter = Router();

router.get("/ai/status", async (_req, res) => {
  const snapshot = await getAiSnapshot();
  res.json(
    GetAiStatusResponse.parse({
      provider: snapshot.provider,
      available: snapshot.available,
      model: snapshot.model,
      installed: snapshot.installed,
      message: snapshot.message,
    }),
  );
});

router.get("/ai/models", async (_req, res) => {
  const snapshot = await getAiSnapshot();
  res.json(
    GetAiModelsResponse.parse({
      models: snapshot.models,
      selected: snapshot.model,
      available: snapshot.available,
    }),
  );
});

export default router;