export default {
    async fetch(request: Request, env) {
        try {
            // Parse the incoming request body
            const { prompt, width = 1024, height = 1024 } = await request.json();

            // Validate the input
            if (!prompt) {
                return new Response(JSON.stringify({ error: "Missing 'prompt' parameter" }), { status: 400 });
            }

            // Prepare the AI inputs
            const inputs = { prompt, width, height };

            // Run the Stable Diffusion model via Cloudflare Workers AI
            const response = await env.AI.run("@cf/stabilityai/stable-diffusion-xl-base-1.0", inputs);

            // Return the image as a base64-encoded string
            const base64Image = `data:image/png;base64,${response}`;

            // Respond with the base64 image URL
            return new Response(JSON.stringify({ image_url: base64Image }), {
                headers: { "Content-Type": "application/json" }
            });

        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }
} satisfies ExportedHandler;

