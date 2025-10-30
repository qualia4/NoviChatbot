import type { Context } from "hono";
import {Env} from "./bindings";

export type AppContext = Context<{ Bindings: Env }>;
export type HandleArgs = [AppContext];
