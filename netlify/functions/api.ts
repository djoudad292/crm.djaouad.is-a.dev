/**
 * Netlify Function entry for the NestJS backend.
 *
 * Runtime env vars are preferred; config.json (generated at build time from
 * .env, gitignored) is the fallback so the function can reach the database even
 * when the host has no runtime env configured.
 */
import type { Handler } from "@netlify/functions";
import { NestFactory } from "@nestjs/core";
import serverless from "serverless-http";
import { AppModule } from "../../backend/dist/app.module";
import bundled from "../../backend/config.json";

type RuntimeConfig = Record<string, string>;

let handlerPromise: Promise<Handler> | null = null;

function applyConfig(): void {
  const fallback = (bundled ?? {}) as RuntimeConfig;
  for (const [key, value] of Object.entries(fallback)) {
    if (process.env[key] === undefined && value !== undefined) {
      process.env[key] = String(value);
    }
  }
}

async function createHandler(): Promise<Handler> {
  applyConfig();
  const app = await NestFactory.create(AppModule, { logger: ["error", "warn"] });
  app.enableCors({ origin: true });
  await app.init();
  const express = app.getHttpAdapter().getInstance();
  return serverless(express) as unknown as Handler;
}

export const handler: Handler = async (event, context) => {
  if (!handlerPromise) handlerPromise = createHandler();
  return (await handlerPromise)(event, context);
};