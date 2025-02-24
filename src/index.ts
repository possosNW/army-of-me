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

async function handleNameGeneration(request, env, allowedOrigin) {
    try {
        // Parse request body with defaults
        const { race = "human", gender = "male" } = await request.json();

        console.log(`📛 Generating name for a ${gender} ${race} NPC...`);

        // Call AI model with explicit instruction to return only ONE first + last name
        const nameResponse = await env.AI.run("@cf/mistral/mistral-7b-instruct-v0.1", {
            messages: [
                { 
                    role: "system", 
                    content: `You are an expert in fantasy RPG name generation. Generate **one unique** first and last name for an RPG character. 
                              - Do NOT provide explanations, alternative names, or extra words. 
                              - Output ONLY the name in the format: "Firstname Lastname".` 
                },
                { role: "user", content: `Provide a full fantasy name (first and last) for a ${gender} ${race}.` }
            ],
            max_tokens: 12,  // Ensure it only outputs a two-part name
            temperature: 1.2, // Increase randomness for name variety
            top_p: 0.75       // Control variety while avoiding extra words
        });

        console.log("🛠 AI Raw Response:", nameResponse);

        // ✅ Extract and clean name
        if (!nameResponse || !nameResponse.response) {
            console.error("⚠️ AI failed to generate a name.");
            return new Response(JSON.stringify({ error: "Failed to generate a name." }), { status: 500 });
        }

        let generatedName = nameResponse.response.trim();

        // ✅ Remove extra words, keeping only first + last name
        const nameParts = generatedName.split(/\s+/); // Split by spaces
        if (nameParts.length > 2) {
            generatedName = `${nameParts[0]} ${nameParts[1]}`; // Keep first + last name only
        }

        console.log(`✅ Generated Name: "${generatedName}"`);

        return new Response(JSON.stringify({ name: generatedName }), {
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": allowedOrigin,
                "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            }
        });

    } catch (error) {
        console.error("⚠️ Name generation failed:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Access-Control-Allow-Origin": allowedOrigin }
        });
    }
}


async function handlePromptEnhancer(request, env, allowedOrigin) {
    try {
        const clonedRequest = request.clone();
        const { prompt = "A mighty dwarf paladin" } = await clonedRequest.json();
        console.log(`🎨 Enhancing prompt: "${prompt}"`);

        // Call AI model with enforced style and quality
        const aiResponse = await env.AI.run("@cf/mistral/mistral-7b-instruct-v0.1", {
            messages: [
                { 
                    role: "system", 
                    content: `You are an expert in crafting highly detailed, visually stunning AI prompts for fantasy portraits. 
                              Enhance the given description while ensuring it includes:
                              - Hyper-realistic, ultra-detailed features
                              - Cinematic lighting with depth and mood
                              - Artistic style: Digital painting, high contrast, soft shadows
                              - Image quality: 8K UHD, trending on ArtStation, fantasy concept art
                              - Make sure the final prompt describes a **single character** in a **cohesive scene** without unnecessary backstory.` 
                },
                { role: "user", content: `Enhance this prompt for AI image generation: "${prompt}"` }
            ],
            max_tokens: 150,  // Increase max tokens to allow full description
            temperature: 0.8   // Balance between creativity and consistency
        });

        console.log("🖌 AI Raw Response:", aiResponse);

        // ✅ Extract the correct response field
        if (!aiResponse || !aiResponse.response) {
            console.error("⚠️ AI failed to enhance the prompt.");
            return new Response(JSON.stringify({ error: "Failed to generate enhanced prompt." }), { status: 500 });
        }

        // ✅ Force additional quality/style elements in the final response
        let enhancedPrompt = aiResponse.response.trim();
        enhancedPrompt += " Ultra-high resolution, digital painting, 8K quality, ArtStation trending, cinematic lighting, photorealistic textures.";
        
        console.log(`✅ Enhanced Prompt: "${enhancedPrompt}"`);

        // Return enhanced prompt
        return new Response(JSON.stringify({ enhanced_prompt: enhancedPrompt }), {
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": allowedOrigin
            }
        });

    } catch (error) {
        console.error("⚠️ Prompt enhancement failed:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Access-Control-Allow-Origin": allowedOrigin }
        });
    }
}

async function handleImageGeneration(request, env, allowedOrigin) {
    try {
        // ✅ Clone request and create a tee (splitting into two streams)
        const [req1, req2] = request.body.tee();
        
        // ✅ Read the JSON body once
        const { prompt = "A fantasy portrait of a human warrior" } = await new Response(req1).json();

        console.log(`🎨 Enhancing prompt before image generation: "${prompt}"`);

        // ✅ Step 1: Use prompt enhancer before generating the image
        const enhancerResponse = await handlePromptEnhancer(new Request(request, { body: req2 }), env, allowedOrigin);
        const { enhanced_prompt } = await enhancerResponse.json();

        const finalPrompt = enhanced_prompt || prompt;
        console.log(`✅ Final prompt used for image: "${finalPrompt}"`);

        // ✅ Step 2: Generate the image with the enhanced prompt
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

