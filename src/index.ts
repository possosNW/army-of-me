export default {
    async fetch(request: Request, env) {
        try {
            // Log incoming request details
            console.log("Incoming request:", request.method, request.url);

            // Handle GET requests
            if (request.method === "GET") {
                console.log("GET request received. Displaying info message.");
                return new Response(JSON.stringify({
                    message: "Welcome to the Army of Me Image Generator! Use a POST request with a JSON body to generate images."
                }), { status: 200, headers: { "Content-Type": "application/json" } });
            }

            // Parse JSON body
            const body = await request.json().catch((err) => {
                console.error("Failed to parse JSON:", err);
                return {};
            });

            // Log parsed JSON
            console.log("Parsed JSON body:", body);

            const { prompt, width = 1024, height = 1024 } = body;

            // Set a default prompt if none provided
            const finalPrompt = prompt && prompt.trim() !== "" 
                ? prompt 
                : "Oops! Missing prompt! Here's a placeholder portrait.";

            console.log(`Using prompt: "${finalPrompt}" with dimensions ${width}x${height}`);

            // Prepare AI inputs
            const inputs = { prompt: finalPrompt, width, height };

            // Run the AI model
            console.log("Sending request to Cloudflare AI model...");
            const response = await env.AI.run("@cf/stabilityai/stable-diffusion-xl-base-1.0", inputs);

            // Check response size
            if (!response || response.length < 100) {
                console.error("AI model returned an unusually small response:", response);
                return new Response(JSON.stringify({
                    error: "AI model returned insufficient data. Check model configuration or input parameters."
                }), { status: 500 });
            }

            console.log("AI model response size:", response.length);

            // Convert the response into a base64 image string
            const base64Image = `data:image/png;base64,${response}`;

            // Respond with the base64-encoded image
            console.log("Successfully generated image. Returning response...");
            return new Response(JSON.stringify({ image_url: base64Image }), {
                headers: { "Content-Type": "application/json" }
            });

        } catch (error) {
            console.error("Unexpected error during image generation:", error);
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }
} satisfies ExportedHandler;
