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
            const { prompt = "A fantasy portrait of a human warrior", width = 512, height = 512 } = await request.json().catch(() => ({}));

            console.log(`🧠 Generating image with prompt: "${prompt}" (Dimensions: ${width}x${height})`);

            // Validate dimensions
            const safeWidth = Math.max(512, Math.min(width, 1024));
            const safeHeight = Math.max(512, Math.min(height, 1024));

            // Run the AI model
            const response = await env.AI.run("@cf/stabilityai/stable-diffusion-xl-base-1.0", { 
                prompt, 
                width: safeWidth, 
                height: safeHeight 
            });

            // Handle empty response
            if (!response || response.length === 0) {
                console.error("⚠️ AI model returned empty response.");
                return new Response(JSON.stringify({
                    error: "AI model returned no data. Possibly due to invalid input or model issues.",
                    suggested_fix: "Try simplifying the prompt or adjusting dimensions (max 1024x1024)."
                }), { status: 500 });
            }

            // Calculate size
            const sizeKB = (response.length / 1024).toFixed(2);
            console.log(`✅ AI response received: ${response.length} bytes (~${sizeKB} KB)`);

            // Return the binary response directly as an image
            return new Response(response, {
                headers: { "Content-Type": "image/png" }
            });

        } catch (error) {
            console.error("❌ Unexpected error:", error);
            return new Response(JSON.stringify({ 
                error: error.message, 
                details: "Ensure your API key and model ID are correct, and retry the request." 
            }), { status: 500 });
        }
    }
} satisfies ExportedHandler;
