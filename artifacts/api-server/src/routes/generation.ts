import { Router, type IRouter } from "express";
import {
  GenerateFallbackProjectsBody,
  GenerateFallbackProjectsResponse,
  GenerateProjectsBody,
  GenerateProjectsResponse,
} from "@workspace/api-zod";
import { createFallbackProjects, generateProjects } from "../services/project-generator";

const router: IRouter = Router();

router.post("/generate", async (req, res) => {
  const parsed = GenerateProjectsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Please complete the required profile fields before generating." });
    return;
  }
  const result = await generateProjects(parsed.data);
  res.json(GenerateProjectsResponse.parse(result));
});

router.post("/fallback/generate", (req, res) => {
  const parsed = GenerateFallbackProjectsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Please complete the required profile fields before generating." });
    return;
  }
  const projects = createFallbackProjects(parsed.data);
  res.json(
    GenerateFallbackProjectsResponse.parse({
      source: "fallback",
      model: null,
      projects,
      message: "Generated with the built-in local engine.",
    }),
  );
});

export default router;