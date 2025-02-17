export default {
    async fetch(request: Request, env) {
        try {
            // Parse the incoming request body
            const { prompt, width = 1024, height = 1024 } = await request.json();

            // Set a default prompt if none is provided
            const finalPrompt = prompt && prompt.trim() !== "" 
                ? prompt 
                : "Oops! Missing prompt! Here's a placeholder portrait.";

            // Prepare the AI inputs
            const inputs = { prompt: finalPrompt, width, height };

            // Run the Stable Diffusion model via Cloudflare Workers AI
            const response = await env.AI.run("@cf/stabilityai/stable-diffusion-xl-base-1.0", inputs);

            // Convert the response into a base64 image string
            const base64Image = `data:image/png;base64,${response}`;

            // Respond with the base64-encoded image
            return new Response(JSON.stringify({ image_url: base64Image }), {
                headers: { "Content-Type": "application/json" }
            });

        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }
} satisfies ExportedHandler;
