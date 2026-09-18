/**
 * Production Client Engine - SUBBHU AI LABS (Part 3)
 */
const SUPABASE_URL = "https://pgvxbfvyzklqokehtxkx.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_kD5UMF5T7pYqNl4js1V4vg_egYZQW_k";

const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const BackendAPI = {
  // AUTH
  signUp: async (email, password, username) => {
    return await supabaseClient.auth.signUp({
      email,
      password,
      options: { data: { username } }
    });
  },

  signIn: async (email, password) => {
    return await supabaseClient.auth.signInWithPassword({ email, password });
  },

  signOut: async () => {
    return await supabaseClient.auth.signOut();
  },

  getUser: async () => {
    const { data: { user } } = await supabaseClient.auth.getUser();
    return user;
  },

  getProfile: async (userId) => {
    return await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
  },

  // MEDIA UPLOAD
  uploadMedia: async (file, userId) => {
    const ext = file.name.split('.').pop();
    const filePath = `${userId}/${Date.now()}_${Math.random().toString(36).substring(2)}.${ext}`;
    
    const { data, error } = await supabaseClient.storage
      .from('uploads')
      .upload(filePath, file, { cacheControl: '3600', upsert: true });

    if (error) throw error;
    return data.path;
  },

  // GENERATION & ATOMIC CREDIT WORKFLOW
  startGeneration: async (toolType, filePath) => {
    const user = await BackendAPI.getUser();
    if (!user) throw new Error("Please sign in to run AI workflows.");

    const cost = toolType.includes("vid") || toolType.includes("video") ? 5 : 1;

    const { data: deductRes, error: rpcError } = await supabaseClient.rpc("deduct_credits_atomic", {
      p_user_id: user.id,
      p_amount: cost,
      p_description: `Run ${toolType}`
    });

    if (rpcError) throw new Error(rpcError.message);
    if (!deductRes || !deductRes.success) {
      throw new Error(deductRes?.message || "Insufficient credits. Please upgrade.");
    }

    const { data: generation, error: genError } = await supabaseClient
      .from("generations")
      .insert({
        user_id: user.id,
        tool_type: toolType,
        input_url: filePath,
        status: "queued"
      })
      .select()
      .single();

    if (genError) throw new Error(genError.message);

    return {
      success: true,
      generation_id: generation.id,
      remaining_credits: deductRes.remaining_credits
    };
  },

  // TEMPLATES
  getTemplates: async (category = null) => {
    let query = supabaseClient.from('templates').select('*');
    if (category) query = query.eq('category', category);
    return await query;
  },

  // HISTORY
  getHistory: async (userId) => {
    return await supabaseClient
      .from('generations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
  },

  deleteGeneration: async (id) => {
    return await supabaseClient
      .from('generations')
      .delete()
      .eq('id', id);
  },

  // REWARD ADS CLAIM
  claimReward: async (userId) => {
    const { data, error } = await supabaseClient.rpc("claim_reward_credits", {
      p_user_id: userId
    });
    if (error) throw error;
    return data;
  },

  // ADMIN VERIFICATION & METRICS
  checkIsAdmin: async (userId) => {
    const { data, error } = await supabaseClient.rpc("is_admin", { p_user_id: userId });
    return !error && data === true;
  },

  getAdminMetrics: async (userId) => {
    const { data, error } = await supabaseClient.rpc("get_admin_metrics", { p_user_id: userId });
    if (error) throw error;
    return data;
  },

  // MONETIZATION (REAL ARCHITECTURE WITH MISSING CONFIG CHECK)
  createCheckout: async (plan) => {
    const user = await BackendAPI.getUser();
    if (!user) throw new Error("Please log in to upgrade.");

    // Check if real gateway keys are present in env
    const gatewayConfigured = false; // Set to true when Razorpay/Stripe keys added to Supabase secrets

    if (!gatewayConfigured) {
      throw new Error("Payment Gateway NOT CONFIGURED. Please set RAZORPAY_KEY_ID or STRIPE_SECRET in Supabase backend.");
    }

    return { success: false };
  }
};

window.BackendAPI = BackendAPI;
