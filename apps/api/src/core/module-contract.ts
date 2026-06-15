import type { FastifyInstance } from "fastify";

export type ApiModule = {
  name: string;
  register: (app: FastifyInstance) => Promise<void> | void;
};
