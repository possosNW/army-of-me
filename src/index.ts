export default {
    async fetch(request: Request, env) {
        try {
            if (request.method === "GET") {
                return new Response(JSON.stringify({
                    message: "Welcome to the Army of Me Image Generator!"
                }), { 
                    status: 200, 
                    headers: { 
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*"   // Allow all origins
                    } 
                });
            }

            const { prompt = "A fantasy portrait of a human warrior" } = await request.json().catch(() => ({}));

            console.log(`🧠 Generating image with prompt: "${prompt}"`);

            const response = await env.AI.run("@cf/stabilityai/stable-diffusion-xl-base-1.0", { 
                prompt, 
                width: 1024, 
                height: 1024 
            });

            if (!response || response.length === 0) {
                console.error("⚠️ AI model returned empty response.");
                return new Response(JSON.stringify({
                    error: "AI model returned no data."
                }), { 
                    status: 500,
                    headers: { "Access-Control-Allow-Origin": "*" }
                });
            }

            console.log(`✅ Response size: ${response.length} bytes`);

            return new Response(response, {
                headers: {
                    "Content-Type": "image/png",
                    "Access-Control-Allow-Origin": "*" // 🔑 Add this line!
                }
            });

        } catch (error) {
            console.error("❌ Unexpected error:", error);
            return new Response(JSON.stringify({ 
                error: error.message 
            }), { 
                status: 500,
                headers: { "Access-Control-Allow-Origin": "*" }
            });
        }
    }
} satisfies ExportedHandler;
