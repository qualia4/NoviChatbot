// index.ts - Enhanced with MCP endpoints
import { ApiException, fromHono } from "chanfana";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { DummyEndpoint } from "./endpoints/dummyEndpoint";
import { SignupEndpoint } from "./endpoints/auth/signupEndpoint";
import { LoginEndpoint } from "./endpoints/auth/loginEndpoint";
import { SendMessageEndpoint } from "./endpoints/messages/sendMessageEndpoint";
import { GetMessagesEndpoint } from "./endpoints/messages/getMessagesEndpoint";
import { ClearMessagesEndpoint } from "./endpoints/messages/clearMessagesEndpoint";
import { ConnectMCPServerEndpoint } from "./endpoints/mcp/connectServerEndpoint";
import { ListMCPServersEndpoint } from "./endpoints/mcp/listServersEndpoint";
import { ListMCPToolsEndpoint } from "./endpoints/mcp/listToolsEndpoint";

const app = new Hono<{ Bindings: Env }>();

// Add CORS middleware for Swagger UI to work properly
app.use("/*", cors());

app.onError((err, c) => {
	if (err instanceof ApiException) {
		return c.json(
			{ success: false, errors: err.buildResponse() },
			err.status as ContentfulStatusCode
		);
	}

	console.error("Global error handler:", err);
	return c.json(
		{
			success: false,
			errors: [{ code: 7000, message: "Internal Server Error" }],
		},
		500
	);
});

const openapi = fromHono(app, {
	docs_url: "/",
	schema: {
		info: {
			title: "Chatbot API with MCP Support",
			version: "2.0.0",
			description:
				"API for authentication, chat messages, and MCP (Model Context Protocol) server integration. " +
				"Use /auth/signup or /auth/login to get a token, then click the Authorize button to use it. " +
				"Connect external MCP servers to enable the chatbot to use external tools.",
		},
	},
});

// CRITICAL: Register the bearerAuth security scheme
// This is what makes the Authorize button appear in Swagger UI
openapi.registry.registerComponent("securitySchemes", "bearerAuth", {
	type: "http",
	scheme: "bearer",
	bearerFormat: "JWT",
	description: "Enter your JWT token from /auth/login or /auth/signup",
});

// Authentication routes
openapi.post("/auth/signup", SignupEndpoint);
openapi.post("/auth/login", LoginEndpoint);

// Message routes
openapi.post("/messages/send", SendMessageEndpoint);
openapi.get("/messages", GetMessagesEndpoint);
openapi.delete("/messages", ClearMessagesEndpoint);

// MCP routes
openapi.post("/mcp/servers", ConnectMCPServerEndpoint);
openapi.get("/mcp/servers", ListMCPServersEndpoint);
openapi.get("/mcp/servers/:server_id/tools", ListMCPToolsEndpoint);

// Dummy endpoint for testing
openapi.post("/dummy/:slug", DummyEndpoint);

export default app;