export default {
    async fetch(request: Request, env) {
        const allowedOrigin = "https://littlebigparty.duckdns.org";

        if (request.method === "OPTIONS") {
            return new Response(null, {
                status: 204,
                headers: {
                    "Access-Control-Allow-Origin": allowedOrigin,
                    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type"
                }
            });
        }

        try {
            const url = new URL(request.url);

            if (request.method === "GET") {
                return new Response(JSON.stringify({
                    message: "Welcome to the Army of Me AI Service! Use POST requests for name generation, prompt enhancement, or image generation."
                }), {
                    status: 200,
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": allowedOrigin
                    }
                });
            }

            if (url.pathname === "/generate-name") {
                return await handleNameGeneration(request, env, allowedOrigin);
            }

            if (url.pathname === "/prompt-enhancer") {
                return await handlePromptEnhancer(request, env, allowedOrigin);
            }

            if (url.pathname === "/generate-image") {
                return await handleImageGeneration(request, env, allowedOrigin);
            }

            return new Response(JSON.stringify({ error: "Invalid endpoint" }), {
                status: 404,
                headers: { "Access-Control-Allow-Origin": allowedOrigin }
            });

        } catch (error) {
            console.error("❌ Unexpected error:", error);
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: { "Access-Control-Allow-Origin": allowedOrigin }
            });
        }
    }
} satisfies ExportedHandler;

async function handlePromptEnhancer(request, env, allowedOrigin) {
    try {
        const { prompt = "A mighty dwarf paladin" } = await request.json();
        console.log(`🎨 Enhancing prompt: "${prompt}"`);

        const aiResponse = await env.AI.run("@cf/mistral/mistral-7b-instruct-v0.1", {
            messages: [
                { role: "system", content: "Enhance this prompt for AI-generated art. The output should be **one** single descriptive line, adding cinematic lighting, dramatic effects, and realistic details. Do NOT include titles, scene descriptions, or introductions. Just return the enhanced prompt." },
                { role: "user", content: `Enhance this AI image prompt: "${prompt}"` }
            ],
            max_tokens: 60,
            temperature: 0.8
        });

        console.log("🖌 AI Raw Response:", JSON.stringify(aiResponse, null, 2));

        // Extracting the correct response
        if (!aiResponse?.response) {
            console.error("⚠️ AI failed to enhance the prompt.");
            return new Response(JSON.stringify({ error: "Failed to generate enhanced prompt." }), { status: 500 });
        }

        let enhancedPrompt = aiResponse.response.trim();

        // Remove unwanted prefixes like "Title:" or "Scene Description:"
        enhancedPrompt = enhancedPrompt.replace(/^Title:|Scene Description:/i, "").trim();

        console.log(`✅ Enhanced Prompt: "${enhancedPrompt}"`);

        return new Response(JSON.stringify({ enhanced_prompt: enhancedPrompt }), {
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": allowedOrigin,
                "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            }
        });

    } catch (error) {
        console.error("⚠️ Prompt enhancement failed:", error);
        return new Response(JSON.stringify({ error: "Failed to generate enhanced prompt." }), {
            status: 500,
            headers: { "Access-Control-Allow-Origin": allowedOrigin }
        });
    }
}

async function handleImageGeneration(request: Request, env, allowedOrigin: string) {
    try {
        const { prompt = "A fantasy portrait of a human warrior" } = await request.json();
        console.log(`🎨 Enhancing prompt before image generation: "${prompt}"`);

        // Step 1: Use prompt enhancer before generating the image
        const enhancerResponse = await handlePromptEnhancer(request, env, allowedOrigin);
        const { enhanced_prompt } = await enhancerResponse.json();

        const finalPrompt = enhanced_prompt || prompt;
        console.log(`✅ Final prompt used for image: "${finalPrompt}"`);

        // Step 2: Generate the image with the enhanced prompt
        const response = await env.AI.run("@cf/stabilityai/stable-diffusion-xl-base-1.0", {
            prompt: finalPrompt,
            width: 1024,
            height: 1024
        });

        if (!response || response.length === 0) {
            console.error("⚠️ AI model returned empty response.");
            return new Response(JSON.stringify({
                error: "AI model returned no data."
            }), {
                status: 500,
                headers: { "Access-Control-Allow-Origin": allowedOrigin }
            });
        }

        console.log(`✅ Response size: ${response.length} bytes`);

        return new Response(response, {
            headers: {
                "Content-Type": "image/png",
                "Access-Control-Allow-Origin": allowedOrigin
            }
        });

    } catch (error) {
        console.error("⚠️ Image generation failed:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Access-Control-Allow-Origin": allowedOrigin }
        });
    }
}
