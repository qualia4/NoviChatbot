import { contentJson, OpenAPIRoute } from "chanfana";
import type { AppContext } from "../../types";
import { z } from "zod";
import { supa } from "../../supabase";
import { generateToken, verifyPassword } from "../../auth"; // see note below

export class LoginEndpoint extends OpenAPIRoute {
    public schema = {
        tags: ["Auth"],
        summary: "Login with username and password",
        operationId: "login",
        request: {
            body: contentJson(
                z.object({
                    username: z.string().min(3).max(255),
                    password: z.string().min(6),
                })
            ),
        },
        responses: {
            "200": {
                description: "Login successful",
                ...contentJson({
                    success: z.boolean(),
                    result: z.object({
                        username: z.string(),
                        token: z.string(),
                    }),
                }),
            },
            "401": {
                description: "Invalid credentials",
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

        // get stored password hash
        const { data: user, error } = await client
            .from("users")
            .select("username, password")
            .eq("username", username)
            .maybeSingle();

        if (error) {
            console.error("Read user error:", error);
            return c.json(
                { success: false, errors: [{ code: 7000, message: "Internal Server Error" }] },
                500
            );
        }

        // user not found or password mismatch
        if (!user) {
            return c.json(
                { success: false, errors: [{ code: 4010, message: "Invalid username or password" }] },
                401
            );
        }

        const ok = await verifyPassword(password, user.password);
        if (!ok) {
            return c.json(
                { success: false, errors: [{ code: 4010, message: "Invalid username or password" }] },
                401
            );
        }

        const token = await generateToken(user.username);

        return c.json(
            {
                success: true,
                result: {
                    username: user.username,
                    token,
                },
            },
            200
        );
    }
}
