const SUPABASE_URL = "https://pgvxbfvyzklqokehtxkx.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_kD5UMF5T7pYqNl4js1V4vg_egYZQW_k";

const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const BackendAPI = {
  getUser: async () => {
    const { data: { user } } = await supabaseClient.auth.getUser();
    return user;
  },

  getProfile: async (userId) => {
    return await supabaseClient.from('profiles').select('*').eq('id', userId).maybeSingle();
  },

  uploadMedia: async (file, userId) => {
    const ext = file.name.split('.').pop();
    const filePath = `${userId}/${Date.now()}_${Math.random().toString(36).substring(2)}.${ext}`;
    const { data, error } = await supabaseClient.storage.from('uploads').upload(filePath, file, { cacheControl: '3600', upsert: true });
    if (error) throw error;
    return data.path;
  },

  uploadOutputToStorage: async (blob, userId, toolType) => {
    try {
      const isPng = toolType === 'bg-remove' || toolType.includes('bg');
      const ext = isPng ? 'png' : 'jpg';
      const filePath = `${userId}/enhanced_${Date.now()}.${ext}`;
      
      const { data, error } = await supabaseClient.storage
        .from('outputs')
        .upload(filePath, blob, {
          contentType: isPng ? 'image/png' : 'image/jpeg',
          cacheControl: '3600',
          upsert: true
        });

      if (error) return null;
      const { data: publicData } = supabaseClient.storage.from('outputs').getPublicUrl(filePath);
      return publicData?.publicUrl || filePath;
    } catch (e) {
      return null;
    }
  },

  startGeneration: async (toolType, filePath) => {
    const user = await BackendAPI.getUser();
    if (!user) throw new Error("Please sign in to run AI workflows.");

    const cost = 1;
    const { data: deductRes, error: rpcError } = await supabaseClient.rpc("deduct_credits_atomic", {
      p_user_id: user.id,
      p_amount: cost,
      p_description: `Run ${toolType}`
    });

    if (rpcError) throw new Error(rpcError.message);
    if (!deductRes || !deductRes.success) {
      throw new Error(deductRes?.message || "Insufficient credits.");
    }

    const { data: generation, error: genError } = await supabaseClient.from("generations").insert({
      user_id: user.id,
      tool_type: toolType,
      input_url: filePath,
      status: "processing"
    }).select().single();

    if (genError) throw genError;

    return {
      success: true,
      generation_id: generation.id,
      remaining_credits: deductRes.remaining_credits
    };
  },

  enhanceImageLocal: async (file, toolType) => {
    const isBg = toolType === 'bg-remove' || toolType.includes('bg');

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;

        // REAL AI BACKGROUND SEGMENTATION (MediaPipe)
        if (isBg && window.SelfieSegmentation) {
          const statusEl = document.getElementById('processingStatusText');
          if (statusEl) statusEl.innerText = "3/4 AI detecting person & isolating background...";

          const selfieSegmentation = new window.SelfieSegmentation({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`
          });

          selfieSegmentation.setOptions({
            modelSelection: 1 // Full person model
          });

          selfieSegmentation.onResults((results) => {
            ctx.save();
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Mask draw karein
            ctx.drawImage(results.segmentationMask, 0, 0, canvas.width, canvas.height);
            
            // Subject retain karein, baki transparent
            ctx.globalCompositeOperation = 'source-in';
            ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
            ctx.restore();

            canvas.toBlob((blob) => {
              if (blob) {
                resolve({ blob, outputUrl: URL.createObjectURL(blob) });
              } else {
                reject(new Error("Failed to create cutout blob"));
              }
            }, 'image/png');
          });

          await selfieSegmentation.send({ image: img });
          return;
        }

        // Photo Enhancer filters
        if (toolType.includes('color')) {
          ctx.filter = 'contrast(130%) saturate(150%) brightness(105%)';
        } else if (toolType.includes('restore') || toolType.includes('denoise')) {
          ctx.filter = 'contrast(115%) brightness(110%) blur(0.2px)';
        } else {
          ctx.filter = 'contrast(120%) saturate(120%) brightness(108%)';
        }

        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          resolve({ blob, outputUrl: URL.createObjectURL(blob) });
        }, 'image/jpeg', 0.95);
      };

      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  },

  completeTask: async (generationId, outputUrl) => {
    await supabaseClient.from("generations").update({
      status: "completed",
      output_url: outputUrl,
      completed_at: new Date().toISOString()
    }).eq("id", generationId);
  }
};

window.BackendAPI = BackendAPI;
