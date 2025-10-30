import { contentJson, OpenAPIRoute } from "chanfana";
import type { AppContext } from "../../types";
import { z } from "zod";
import { supa } from "../../supabase";
import { hashPassword, generateToken } from "../../auth";

export class SignupEndpoint extends OpenAPIRoute {
    public schema = {
        tags: ["Auth"],
        summary: "Register a new user",
        operationId: "signup",
        request: {
            body: contentJson(
                z.object({
                    username: z.string().min(3).max(255),
                    password: z.string().min(6),
                })
            ),
        },
        responses: {
            "201": {
                description: "User created successfully",
                ...contentJson({
                    success: z.boolean(),
                    result: z.object({
                        username: z.string(),
                        token: z.string(),
                    }),
                }),
            },
            "400": {
                description: "Invalid input or user already exists",
                ...contentJson({
                    success: z.boolean(),
                    errors: z.array(
                        z.object({
                            code: z.number(),
                            message: z.string(),
                        })
                    ),
                }),
            },
        },
    };

    public async handle(c: AppContext) {
        const data = await this.getValidatedData<typeof this.schema>();
        const { username, password } = data.body;

        const client = supa(c);

        // Optional pre-check (nice UX, but unique constraint is still the source of truth)
        {
            const { data: existing, error: readErr } = await client
                .from("users")
                .select("username")
                .eq("username", username)
                .maybeSingle();

            if (readErr) {
                // treat read error as 500 to avoid leaking details
                console.error("Read existing user error:", readErr);
                return c.json(
                    {
                        success: false,
                        errors: [{ code: 7000, message: "Internal Server Error" }],
                    },
                    500
                );
            }

            if (existing) {
                return c.json(
                    {
                        success: false,
                        errors: [{ code: 4001, message: "Username already exists" }],
                    },
                    400
                );
            }
        }

        const hashedPassword = await hashPassword(password);

        // Insert new user
        const { data: inserted, error: insertErr } = await client
            .from("users")
            .insert({ username, password: hashedPassword })
            .select("username")
            .single();

        if (insertErr) {
            // Handle unique-constraint race or other insert errors
            if (
                typeof insertErr.message === "string" &&
                insertErr.message.toLowerCase().includes("duplicate")
            ) {
                return c.json(
                    {
                        success: false,
                        errors: [{ code: 4001, message: "Username already exists" }],
                    },
                    400
                );
            }

            console.error("Insert user error:", insertErr);
            return c.json(
                {
                    success: false,
                    errors: [{ code: 7000, message: "Internal Server Error" }],
                },
                500
            );
        }

        const token = await generateToken(username);

        return c.json(
            { success: true, result: { username: inserted.username, token } },
            201
        );
    }
}
