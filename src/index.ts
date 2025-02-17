export default {
    async fetch(request: Request, env) {
        try {
            // Handle GET requests
            if (request.method === "GET") {
                return new Response(JSON.stringify({
                    message: "Welcome to the Army of Me Image Generator! Use a POST request with a JSON body to generate images."
                }), { status: 200, headers: { "Content-Type": "application/json" } });
            }

            // Parse JSON body
            const { prompt, width = 1024, height = 1024 } = await request.json().catch((err) => {
                console.error("Failed to parse JSON:", err);
                return {};
            });

            // Set a default prompt if none is provided
            const finalPrompt = prompt && prompt.trim() !== "" 
                ? prompt 
                : "Oops! Missing prompt! Here's a placeholder portrait.";

            console.log(`Using prompt: "${finalPrompt}" with dimensions ${width}x${height}`);

            // Prepare AI inputs
            const inputs = { prompt: finalPrompt, width, height };

            // Run the AI model
            console.log("Sending request to Cloudflare AI model...");
            const response = await env.AI.run("@cf/stabilityai/stable-diffusion-xl-base-1.0", inputs);

            // Convert binary response (Uint8Array) to base64
            const binary = new Uint8Array(response);
            let binaryString = '';
            for (let i = 0; i < binary.length; i++) {
                binaryString += String.fromCharCode(binary[i]);
            }
            const base64Image = btoa(binaryString);
            const dataUri = `data:image/png;base64,${base64Image}`;

            // Validate response size
            if (base64Image.length < 100) {
                console.error("AI model returned insufficient data. Length:", base64Image.length);
                return new Response(JSON.stringify({
                    error: "AI model returned insufficient data. Check model configuration or input parameters."
                }), { status: 500 });
            }

            console.log("AI model response size:", base64Image.length);

            // Respond with the base64-encoded image
            return new Response(JSON.stringify({ image_url: dataUri }), {
                headers: { "Content-Type": "application/json" }
            });

        } catch (error) {
            console.error("Unexpected error during image generation:", error);
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }
} satisfies ExportedHandler;
