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
        
        // Build the system prompt with strict guidelines
        const systemPrompt = `You are an expert in crafting concise, visually detailed AI image generation prompts.
                            
                            Your task is to enhance the given prompt into a SINGLE PARAGRAPH (max 80 words) that describes ONLY the visual elements.
                            
                            INCLUDE:
                            - Character: specific facial features, expression, pose
                            - Attire: detailed description of armor/clothing, focus on textures and materials
                            - Lighting: ${moodLighting[mood] || "cinematic lighting with depth"}
                            - Style: ${styleGuides[style] || "Digital painting, high contrast"}
                            
                            DO NOT INCLUDE:
                            - Backstory or narrative elements
                            - Multiple paragraphs
                            - Non-visual descriptions
                            - Generic phrases like "in this image"
                            
                            FORMAT:
                            - Single, concise paragraph
                            - Focus on specific visual adjectives
                            - Start with the main subject immediately`;
        
        // Add custom details from request if provided
        const customDetails = details.customInstructions ? `\n\nAlso incorporate these specific elements: ${details.customInstructions}` : "";
        
        // Example prompt to guide the model
        const examplePrompt = `\n\nEXAMPLE:
        Input: "Warrior with sword"
        Output: "Battle-hardened warrior with chiseled jawline and piercing blue eyes, wielding an ancestral longsword with intricate gold filigree. Heavy plate armor with ornate lion motifs, illuminated by dramatic sunset backlighting creating a golden outline. Photorealistic textures, 8K detail, digital painting."`;
        
        const aiResponse = await env.AI.run(env.PROMPT_ENHANCER_MODEL || "@cf/mistral/mistral-7b-instruct-v0.1", {
            messages: [
                { role: "system", content: systemPrompt + customDetails + examplePrompt },
                { role: "user", content: `Enhance this prompt for AI image generation: "${prompt}"` }
            ],
            max_tokens: 200, // Limited token count to force conciseness
            temperature: 0.6  // Lower temperature for more reliable outputs
        });
        
        console.log("🖌 AI Raw Response:", aiResponse);
        
        if (!aiResponse || !aiResponse.response) {
            console.error("⚠️ AI failed to enhance the prompt.");
            return createErrorResponse("Failed to generate enhanced prompt.", 500, allowedOrigin);
        }
        
        let enhancedPrompt = aiResponse.response.trim();
        
        // Clean up any artifacts from the response
        enhancedPrompt = enhancedPrompt.replace(/^(Output:|Enhanced prompt:|Result:)/i, "").trim();
        
        // Ensure the prompt ends with high-quality indicators if not already included
        const qualityTerms = ["8k", "ultra-high resolution", "photorealistic", "artstation"];
        const hasQualityTerms = qualityTerms.some(term => enhancedPrompt.toLowerCase().includes(term));
        
        if (!hasQualityTerms) {
            enhancedPrompt += " Ultra-high resolution, 8K quality, photorealistic textures, trending on ArtStation.";
        }
        
        console.log(`✅ Enhanced Prompt: "${enhancedPrompt}"`);
        
        return new Response(JSON.stringify({ 
            enhanced_prompt: enhancedPrompt,
            original_prompt: prompt,
            style: style,
            mood: mood,
            word_count: enhancedPrompt.split(/\s+/).length
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

async function handleDualPromptEnhancer(request, env, allowedOrigin) {
    try {
        const { 
            prompt = "A mighty dwarf paladin",
            style = "fantasy", 
            mood = "epic", 
            details = {} 
        } = await request.json();
        
        console.log(`🎨 Enhancing prompt for dual images: "${prompt}" with style: ${style}, mood: ${mood}`);
        
        // Style guides for different artistic styles
        const styleGuides = {
            fantasy: "digital painting, high contrast, soft shadows, fantasy concept art, trending on ArtStation",
            cyberpunk: "neon lighting, high contrast, cyberpunk aesthetic, futuristic, trending on ArtStation",
            medieval: "oil painting style, historical accuracy, detailed armor and clothing, dramatic lighting",
            ethereal: "soft dreamy lighting, pastel colors, magical atmosphere, ethereal glow, particle effects"
        };
        
        // Lighting variations based on mood
        const moodLighting = {
            epic: "dramatic backlighting, golden hour, god rays",
            dark: "low-key lighting, deep shadows, moody atmosphere",
            peaceful: "soft ambient lighting, gentle highlights, balanced exposure",
            mysterious: "foggy atmosphere, partial lighting, deep shadows with highlights"
        };
        
        // System prompt to generate consistent character details
        const characterSystemPrompt = `You are an expert in crafting highly detailed, visually consistent AI image generation prompts.
                            
                            Your task is to create a CHARACTER DETAILS SHEET with specific visual attributes that can be used for both portrait and full-body images.
                            
                            For the given character prompt, provide ONLY these details in a structured format:
                            
                            1. FACE: detailed description of facial features, expression, skin texture, eye color
                            2. HAIR: style, color, texture, any adornments
                            3. SPECIAL FEATURES: scars, markings, unique characteristics  
                            4. CLOTHING/ARMOR: detailed description focusing on materials, colors, and distinctive elements
                            5. ACCESSORIES: weapons, jewelry, or other carried items
                            6. COLOR PALETTE: 3-5 main colors that define this character
                            
                            DO NOT INCLUDE:
                            - Backstory or narrative elements
                            - Poses or composition (these will be added later)
                            - Lighting descriptions (these will be added later)
                            
                            FORMAT:
                            - Short, specific descriptions for each category
                            - Focus on visual details that will remain consistent across both images`;
        
        // Get the character details first
        const characterDetailsResponse = await env.AI.run(env.PROMPT_ENHANCER_MODEL || "@cf/mistral/mistral-7b-instruct-v0.1", {
            messages: [
                { role: "system", content: characterSystemPrompt },
                { role: "user", content: `Create character details for: "${prompt}"` }
            ],
            max_tokens: 300,
            temperature: 0.6
        });
        
        if (!characterDetailsResponse || !characterDetailsResponse.response) {
            throw new Error("Failed to generate character details");
        }
        
        const characterDetails = characterDetailsResponse.response.trim();
        console.log("👤 Character Details:", characterDetails);
        
        // Now create the portrait prompt
        const portraitSystemPrompt = `You are an expert in creating prompts for AI-generated portrait paintings.
                               
                               Using ONLY the character details provided, create a prompt for a head-and-shoulders portrait with these specifications:
                               
                               - Framed as a painted portrait on a wooden canvas
                               - Focus on facial details, expression, and upper armor/clothing
                               - Include ${moodLighting[mood] || "dramatic lighting"} that highlights the face
                               - Style: ${styleGuides[style] || "Digital painting, high contrast"}
                               
                               FORMAT:
                               - Single, concise paragraph (max 100 words)
                               - Start with a clear description of the portrait format
                               - End with technical specifications`;
        
        // Create the full body prompt
        const fullBodySystemPrompt = `You are an expert in creating prompts for AI-generated full-body character art.
                                
                                Using ONLY the character details provided, create a prompt for a full-body image with these specifications:
                                
                                - Show the complete character from head to toe
                                - Include a suitable background/environment that complements the character
                                - Dynamic pose that displays armor/clothing and any weapons/items
                                - Include ${moodLighting[mood] || "dramatic lighting"} that enhances the scene
                                - Style: ${styleGuides[style] || "Digital painting, high contrast"}
                                
                                FORMAT:
                                - Single, concise paragraph (max 100 words)
                                - Start with the character's stance/pose
                                - Include environmental context
                                - End with technical specifications`;
        
        // Generate both prompts in parallel
        const [portraitResponse, fullBodyResponse] = await Promise.all([
            env.AI.run(env.PROMPT_ENHANCER_MODEL || "@cf/mistral/mistral-7b-instruct-v0.1", {
                messages: [
                    { role: "system", content: portraitSystemPrompt },
                    { role: "user", content: characterDetails }
                ],
                max_tokens: 200,
                temperature: 0.6
            }),
            env.AI.run(env.PROMPT_ENHANCER_MODEL || "@cf/mistral/mistral-7b-instruct-v0.1", {
                messages: [
                    { role: "system", content: fullBodySystemPrompt },
                    { role: "user", content: characterDetails }
                ],
                max_tokens: 200,
                temperature: 0.6
            })
        ]);
        
        if (!portraitResponse?.response || !fullBodyResponse?.response) {
            throw new Error("Failed to generate one or both prompts");
        }
        
        // Process the portrait prompt
        let portraitPrompt = portraitResponse.response.trim();
        portraitPrompt = portraitPrompt.replace(/^(Output:|Enhanced prompt:|Result:)/i, "").trim();
        
        // Process the full body prompt
        let fullBodyPrompt = fullBodyResponse.response.trim();
        fullBodyPrompt = fullBodyPrompt.replace(/^(Output:|Enhanced prompt:|Result:)/i, "").trim();
        
        // Ensure quality terms for both prompts
        const qualityTerms = ["8k", "ultra-high resolution", "photorealistic", "artstation"];
        
        if (!qualityTerms.some(term => portraitPrompt.toLowerCase().includes(term))) {
            portraitPrompt += " Ultra-high resolution, 8K quality, photorealistic textures, wooden canvas frame, trending on ArtStation.";
        }
        
        if (!qualityTerms.some(term => fullBodyPrompt.toLowerCase().includes(term))) {
            fullBodyPrompt += " Ultra-high resolution, 8K quality, photorealistic textures, trending on ArtStation.";
        }
        
        console.log(`✅ Portrait Prompt: "${portraitPrompt}"`);
        console.log(`✅ Full Body Prompt: "${fullBodyPrompt}"`);
        
        return new Response(JSON.stringify({ 
            portrait_prompt: portraitPrompt,
            full_body_prompt: fullBodyPrompt,
            character_details: characterDetails,
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
        console.error("⚠️ Dual prompt enhancement failed:", error);
        return createErrorResponse(error.message, 500, allowedOrigin);
    }
}

async function handleDualEnhancedImageGeneration(request, env, allowedOrigin) {
    try {
        // Clone the request body to read it multiple times
        const [req1, req2] = request.body.tee();
        
        // Extract the original request data
        const requestData = await new Response(req1).json();
        const { 
            prompt = "A fantasy portrait of a human warrior",
            style = "fantasy",
            mood = "epic" 
        } = requestData;
        
        console.log(`🎨 Generating dual images with prompt: "${prompt}", style: ${style}, mood: ${mood}`);
        
        // First, enhance the prompt to get both portrait and full body prompts
        const enhancerRequest = new Request(request.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt,
                style,
                mood,
                details: requestData.details || {}
            })
        });
        
        const enhancerResponse = await handleDualPromptEnhancer(enhancerRequest, env, allowedOrigin);
        
        if (!enhancerResponse.ok) {
            throw new Error("Failed to enhance prompts");
        }
        
        // Extract the enhanced prompts
        const { portrait_prompt, full_body_prompt, character_details } = await enhancerResponse.json();
        
        console.log(`✅ Portrait prompt: "${portrait_prompt}"`);
        console.log(`✅ Full body prompt: "${full_body_prompt}"`);
        
        // Step 1: Generate the portrait image first
        const portraitResponse = await handleImageGeneration(
            new Request(request.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    prompt: portrait_prompt,
                    width: 768,
                    height: 1024,
                    style_preset: style === "fantasy" ? "fantasy-art" : style
                })
            }),
            env,
            allowedOrigin
        );
        
        if (!portraitResponse.ok) {
            throw new Error("Failed to generate portrait image");
        }
        
        // Extract the portrait image data
        const portraitData = await portraitResponse.json();
        const portraitImage = portraitData.image; // Base64 encoded image
        
        if (!portraitImage) {
            throw new Error("No portrait image generated");
        }
        
        // Step 2: Use the portrait as input for the full body image using img2img
        const fullBodyResponse = await handleImg2ImgGeneration(
            new Request(request.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    prompt: full_body_prompt,
                    init_image: portraitImage, // Use the portrait as the initial image
                    width: 512,
                    height: 1024,
                    strength: 0.7, // How much to preserve from the original image (0.6-0.8 is a good range)
                    style_preset: style === "fantasy" ? "fantasy-art" : style
                })
            }),
            env,
            allowedOrigin
        );
        
        if (!fullBodyResponse.ok) {
            throw new Error("Failed to generate full body image");
        }
        
        // Extract the full body image data
        const fullBodyData = await fullBodyResponse.json();
        
        // Return both images and prompts
        return new Response(JSON.stringify({ 
            portrait: {
                image: portraitData.image,
                prompt: portrait_prompt,
                dimensions: "768x1024"
            },
            full_body: {
                image: fullBodyData.image,
                prompt: full_body_prompt,
                dimensions: "512x1024"
            },
            character_details,
            original_prompt: prompt,
            style,
            mood
        }), {
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": allowedOrigin
            }
        });
    } catch (error) {
        console.error("⚠️ Dual enhanced image generation failed:", error);
        return createErrorResponse(error.message, 500, allowedOrigin);
    }
}

async function handleImageGeneration(request: Request, env: any, allowedOrigin: string): Promise<Response> {
  try {
    const { prompt, width = 768, height = 1024, style_preset = "fantasy-art" } = await request.json();

    // Validate that dimensions are multiples of 256
    if (width % 256 !== 0 || height % 256 !== 0) {
      throw new Error("Image dimensions must be multiples of 256");
    }

    console.log(`🖌️ Generating text-to-image with dimensions ${width}x${height}`);

    // Use Cloudflare Workers AI for text-to-image
    const response = await env.AI.run("@cf/stabilityai/stable-diffusion-xl-base-1.0", {
      prompt: prompt,
      width: width,
      height: height,
      num_steps: 20, // Ensure num_steps is within allowed limits
      guidance: 7.5
    });

    if (!response) {
      throw new Error("No response from image generation API");
    }

    // Log the response to inspect its structure
    console.log("API Response:", response);

    // Check if the response is in the expected format
    if (response instanceof Response && response.body) {
      const imageBuffer = await response.arrayBuffer();
      const base64Image = Buffer.from(imageBuffer).toString('base64');

      return new Response(JSON.stringify({
        image: base64Image,
        prompt,
        width,
        height
      }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": allowedOrigin
        }
      });
    } else if (response instanceof Object) {
      // Handle JSON or other object responses
      return new Response(JSON.stringify({
        error: "Unexpected response format",
        details: response
      }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": allowedOrigin
        },
        status: 500
      });
    } else {
      throw new Error("Unexpected response format from image generation API");
    }
  } catch (error) {
    console.error("⚠️ Image generation failed:", error);
    return createErrorResponse(error.message, 500, allowedOrigin);
  }
}

// Image-to-image generation using the portrait as input
async function handleImg2ImgGeneration(request, env, allowedOrigin) {
    try {
        const { 
            prompt,
            init_image, // Base64 encoded image from the portrait step
            width = 512,
            height = 1024,
            strength = 0.7, // How much to transform the image (0-1)
            style_preset = "fantasy-art"
        } = await request.json();
        
        // Validate that dimensions are multiples of 256
        if (width % 256 !== 0 || height % 256 !== 0) {
            throw new Error("Image dimensions must be multiples of 256");
        }
        
        console.log(`🖌️ Generating image-to-image with dimensions ${width}x${height} and strength ${strength}`);
        
        // Convert base64 to binary for the API
        const binaryImage = Buffer.from(init_image, 'base64');
        
        // Use Cloudflare Workers AI for image-to-image
        const response = await env.AI.run("@cf/stabilityai/stable-diffusion-v1-5-img2img", {
            prompt: prompt,
            init_image: binaryImage,
            width: width,
            height: height,
            strength: strength,
            num_steps: 20,
            guidance: 7.5
        });
        
        if (!response) {
            throw new Error("No response from image-to-image generation API");
        }
        
        // Convert the response to base64
        const imageBuffer = await response.arrayBuffer();
        const base64Image = Buffer.from(imageBuffer).toString('base64');
        
        return new Response(JSON.stringify({ 
            image: base64Image, 
            prompt,
            width,
            height,
            strength
        }), {
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": allowedOrigin
            }
        });
    } catch (error) {
        console.error("⚠️ Image-to-image generation failed:", error);
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
