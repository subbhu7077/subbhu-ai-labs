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

      if (error) {
        console.warn("Storage upload warn:", error);
        return null;
      }
      const { data: publicData } = supabaseClient.storage.from('outputs').getPublicUrl(filePath);
      return publicData?.publicUrl || filePath;
    } catch (e) {
      console.warn("Upload output failed gracefully:", e);
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
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;

        if (toolType === 'bg-remove' || toolType.includes('bg')) {
          ctx.drawImage(img, 0, 0);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const d = imgData.data;

          // Corner sample for background reference
          const bgR = d[0], bgG = d[1], bgB = d[2];
          const threshold = 65;

          for (let i = 0; i < d.length; i += 4) {
            const r = d[i], g = d[i+1], b = d[i+2];
            const dist = Math.sqrt((r - bgR)**2 + (g - bgG)**2 + (b - bgB)**2);
            if (dist < threshold || (r > 215 && g > 215 && b > 215)) {
              d[i+3] = 0; // Cut out background
            }
          }
          ctx.putImageData(imgData, 0, 0);

          canvas.toBlob((blob) => {
            resolve({ blob, outputUrl: URL.createObjectURL(blob) });
          }, 'image/png');
          return;
        }

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
