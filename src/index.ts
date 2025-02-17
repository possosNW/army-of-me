export default {
    async fetch(request: Request, env) {
        try {
            // Handle GET requests with an info message
            if (request.method === "GET") {
                return new Response(JSON.stringify({
                    message: "Welcome to the Army of Me Image Generator! Use a POST request with a JSON body to generate images."
                }), { status: 200, headers: { "Content-Type": "application/json" } });
            }

            // Parse JSON request
            const { prompt = "cyberpunk cat", width = 512, height = 512 } = await request.json().catch(() => ({}));

            console.log(`Prompt: "${prompt}", Dimensions: ${width}x${height}`);

            // Run the AI model
            const response = await env.AI.run("@cf/stabilityai/stable-diffusion-xl-base-1.0", { prompt, width, height });

            if (!response || response.length === 0) {
                console.error("AI model returned empty response.");
                return new Response(JSON.stringify({
                    error: "AI model returned no data. Possibly due to invalid input or model issues."
                }), { status: 500 });
            }

            console.log("AI response received, returning raw binary image...");

            // Return the binary response directly as an image
            return new Response(response, {
                headers: { "Content-Type": "image/png" }
            });

        } catch (error) {
            console.error("Unexpected error:", error);
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }
} satisfies ExportedHandler;
