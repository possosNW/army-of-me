export default {
    async fetch(request: Request, env) {
        try {
            // Handle GET requests
            if (request.method === "GET") {
                return new Response(JSON.stringify({
                    message: "Welcome to Army of Me Image Generator! Use POST with a JSON body to generate images."
                }), { status: 200 });
            }

            // Parse JSON request
            let { prompt, width, height } = await request.json().catch(() => ({}));

            // Use fallback prompt if missing
            if (!prompt || prompt.trim() === "") {
                console.warn("⚠️ Missing prompt - using fallback cyberpunk cat.");
                prompt = "Cyberpunk cat with neon glasses in a futuristic cityscape.";
            }

            // Validate dimensions
            const validWidth = Math.min(Math.max(width || 512, 512), 1024);
            const validHeight = Math.min(Math.max(height || 512, 512), 1024);

            console.log(`🖼️ Generating image with prompt: "${prompt}" (${validWidth}x${validHeight})`);

            // Call Cloudflare AI Model
            const response = await env.AI.run("@cf/stabilityai/stable-diffusion-xl-base-1.0", { 
                prompt, 
                width: validWidth, 
                height: validHeight 
            });

            // Analyze response type
            if (typeof response === "string") {
                console.error("⚠️ AI returned a string instead of binary data:", response);
                return new Response(JSON.stringify({
                    error: "AI returned text instead of an image. Possibly quota or input issue.",
                    details: response
                }), { status: 500 });
            }

            if (!response || response.length === 0) {
                console.error("⚠️ AI model returned empty binary data.");
                return new Response(JSON.stringify({
                    error: "AI model returned empty binary data. Possibly due to invalid input or model issues."
                }), { status: 500 });
            }

            // Validate PNG signature (magic bytes)
            if (!(response[0] === 0x89 && response[1] === 0x50 && response[2] === 0x4E && response[3] === 0x47)) {
                console.error("⚠️ Invalid PNG data received from model. Returning fallback image.");
                // Return fallback cat image if invalid PNG received
                const fallbackPrompt = "Cyberpunk cat with neon glasses in a futuristic cityscape.";
                const fallbackResponse = await env.AI.run("@cf/stabilityai/stable-diffusion-xl-base-1.0", {
                    prompt: fallbackPrompt,
                    width: 512,
                    height: 512
                });
                if (fallbackResponse && fallbackResponse[0] === 0x89) {
                    return new Response(fallbackResponse, {
                        headers: { "Content-Type": "image/png" }
                    });
                } else {
                    return new Response(JSON.stringify({
                        error: "Failed to generate fallback image.",
                    }), { status: 500 });
                }
            }

            const sizeKB = (response.length / 1024).toFixed(2);
            console.log(`✅ Generated valid PNG of size: ${sizeKB} KB`);

            // Return binary PNG
            return new Response(response, {
                headers: { "Content-Type": "image/png" }
            });

        } catch (error) {
            console.error("❌ Unexpected error:", error);
            return new Response(JSON.stringify({ 
                error: error.message 
            }), { status: 500 });
        }
    }
} satisfies ExportedHandler;
