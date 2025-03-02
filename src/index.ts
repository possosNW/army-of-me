export default {
    async fetch(request, env) {
        const allowedOrigin = env.ALLOWED_ORIGIN || "https://littlebigparty.duckdns.org";

        if (request.method === "OPTIONS") {
            return handlePreflightRequest(allowedOrigin);
        }

        try {
            const url = new URL(request.url);

            if (request.method === "GET") {
                return handleGetRequest(allowedOrigin);
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

            if (url.pathname === "/generate-enhanced-image") {
                return await handleEnhancedImageGeneration(request, env, allowedOrigin);
            }

            return createErrorResponse("Invalid endpoint", 404, allowedOrigin);

        } catch (error) {
            console.error("❌ Unexpected error:", error);
            return createErrorResponse(error.message, 500, allowedOrigin);
        }
    }
} satisfies ExportedHandler;

function handlePreflightRequest(allowedOrigin) {
    return new Response(null, {
        status: 204,
        headers: {
            "Access-Control-Allow-Origin": allowedOrigin,
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
        }
    });
}

function handleGetRequest(allowedOrigin) {
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

function createErrorResponse(message, statusCode, allowedOrigin) {
    return new Response(JSON.stringify({ error: message }), {
        status: statusCode,
        headers: { "Access-Control-Allow-Origin": allowedOrigin }
    });
}

async function handleNameGeneration(request, env, allowedOrigin) {
    try {
        const { race = "human", gender = "male" } = await request.json();
        console.log(`📛 Generating name for a ${gender} ${race} NPC...`);

        const nameResponse = await env.AI.run(env.NAME_GENERATION_MODEL || "@cf/mistral/mistral-7b-instruct-v0.1", {
            messages: [
                {
                    role: "system",
                    content: `You are an expert in fantasy RPG name generation. Generate **one unique** first and last name for an RPG character.
                              - Do NOT provide explanations, alternative names, or extra words.
                              - Output ONLY the name in the format: "Firstname Lastname".`
                },
                { role: "user", content: `Provide a full fantasy name (first and last) for a ${gender} ${race}.` }
            ],
            max_tokens: 12,
            temperature: 1.2,
            top_p: 0.75
        });

        console.log("🛠 AI Raw Response:", nameResponse);

        if (!nameResponse || !nameResponse.response) {
            console.error("⚠️ AI failed to generate a name.");
            return createErrorResponse("Failed to generate a name.", 500, allowedOrigin);
        }

        let generatedName = nameResponse.response.trim();
        const nameParts = generatedName.split(/\s+/);
        if (nameParts.length > 2) {
            generatedName = `${nameParts[0]} ${nameParts[1]}`;
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
        return createErrorResponse(error.message, 500, allowedOrigin);
    }
}

async function handlePromptEnhancer(request, env, allowedOrigin) {
    try {
        const { prompt = "A mighty dwarf paladin", style = "fantasy", mood = "epic", details = {} } = await request.json();
        console.log(`🎨 Enhancing prompt: "${prompt}" with style: ${style}, mood: ${mood}`);
        
        // Construct a more dynamic system prompt based on style parameter
        const styleGuides = {
            fantasy: "digital painting, high contrast, soft shadows, fantasy concept art, trending on ArtStation",
            cyberpunk: "neon lighting, high contrast, cyberpunk aesthetic, futuristic, trending on ArtStation",
            medieval: "oil painting style, historical accuracy, detailed armor and clothing, dramatic lighting",
            ethereal: "soft dreamy lighting, pastel colors, magical atmosphere, ethereal glow, particle effects"
        };
        
        // Allow for custom lighting based on mood
        const moodLighting = {
            epic: "dramatic backlighting, golden hour, god rays",
            dark: "low-key lighting, deep shadows, moody atmosphere",
            peaceful: "soft ambient lighting, gentle highlights, balanced exposure",
            mysterious: "foggy atmosphere, partial lighting, deep shadows with highlights"
        };
        
        // Build the system prompt dynamically
        const systemPrompt = `You are an expert in crafting highly detailed, visually stunning AI prompts for ${style} portraits.
                            Enhance the given description into a single cohesive, detailed prompt while including:
                            
                            - Specific character details: facial features, expression, pose, attire, accessories
                            - Environment: setting, background elements that complement the character
                            - Lighting: ${moodLighting[mood] || "cinematic lighting with depth"}
                            - Artistic style: ${styleGuides[style] || "Digital painting, high contrast"}
                            - Technical specifications: 8K UHD, photorealistic textures, volumetric lighting
                            
                            IMPORTANT:
                            1. Focus on VISUAL elements only - avoid narrative backstory
                            2. Keep the description to a SINGLE character in a SINGLE scene
                            3. Be specific about visual details rather than generic descriptors
                            4. Format output as a single paragraph without bullet points`;
        
        // Add custom details from request if provided
        const customDetails = details.customInstructions ? `\n\nAlso incorporate these specific elements: ${details.customInstructions}` : "";
        
        const aiResponse = await env.AI.run(env.PROMPT_ENHANCER_MODEL || "@cf/mistral/mistral-7b-instruct-v0.1", {
            messages: [
                { role: "system", content: systemPrompt + customDetails },
                { role: "user", content: `Enhance this prompt for AI image generation: "${prompt}"` }
            ],
            max_tokens: 300, // Increased token limit for more detailed responses
            temperature: 0.7  // Slightly reduced for more consistent outputs
        });
        
        console.log("🖌 AI Raw Response:", aiResponse);
        
        if (!aiResponse || !aiResponse.response) {
            console.error("⚠️ AI failed to enhance the prompt.");
            return createErrorResponse("Failed to generate enhanced prompt.", 500, allowedOrigin);
        }
        
        let enhancedPrompt = aiResponse.response.trim();
        
        // Add technical quality keywords if not already included
        if (!enhancedPrompt.toLowerCase().includes("8k") && !enhancedPrompt.toLowerCase().includes("resolution")) {
            enhancedPrompt += " Ultra-high resolution, 8K quality, photorealistic textures.";
        }
        
        // Add style keywords if not already included
        if (!enhancedPrompt.toLowerCase().includes("artstation") && !enhancedPrompt.toLowerCase().includes(style.toLowerCase())) {
            enhancedPrompt += ` ${styleGuides[style] || "Digital painting, trending on ArtStation"}`;
        }
        
        console.log(`✅ Enhanced Prompt: "${enhancedPrompt}"`);
        
        return new Response(JSON.stringify({ 
            enhanced_prompt: enhancedPrompt,
            original_prompt: prompt,
            style: style,
            mood: mood
        }), {
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": allowedOrigin
            }
        });
    } catch (error) {
        console.error("⚠️ Prompt enhancement failed:", error);
        return createErrorResponse(error.message, 500, allowedOrigin);
    }
}

async function handleImageGeneration(request, env, allowedOrigin) {
    try {
        const { prompt = "A fantasy portrait of a human warrior" } = await request.json();
        console.log(`🎨 Generating image with prompt: "${prompt}"`);

        const response = await env.AI.run(env.IMAGE_GENERATION_MODEL || "@cf/stabilityai/stable-diffusion-xl-base-1.0", {
            prompt: prompt,
            width: 1024,
            height: 1024
        });

        if (!response || response.length === 0) {
            console.error("⚠️ AI model returned empty response.");
            return createErrorResponse("AI model returned no data.", 500, allowedOrigin);
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
        return createErrorResponse(error.message, 500, allowedOrigin);
    }
}

async function handleEnhancedImageGeneration(request, env, allowedOrigin) {
    try {
        const [req1, req2] = request.body.tee();
        const { prompt = "A fantasy portrait of a human warrior" } = await new Response(req1).json();

        console.log(`🎨 Enhancing prompt before image generation: "${prompt}"`);

        const enhancerResponse = await handlePromptEnhancer(new Request(request, { body: req2 }), env, allowedOrigin);
        const { enhanced_prompt } = await enhancerResponse.json();

        const finalPrompt = enhanced_prompt || prompt;
        console.log(`✅ Final prompt used for image: "${finalPrompt}"`);

        return await handleImageGeneration(new Request(request, { body: JSON.stringify({ prompt: finalPrompt }) }), env, allowedOrigin);

    } catch (error) {
        console.error("⚠️ Enhanced image generation failed:", error);
        return createErrorResponse(error.message, 500, allowedOrigin);
    }
}
