const DubbingProvider = {
  // Supported languages list based on current ElevenLabs official specifications
  languages: [
    { code: "hi", name: "Hindi", flag: "🇮🇳" },
    { code: "en", name: "English", flag: "🇺🇸" },
    { code: "zh", name: "Chinese (Simplified)", flag: "🇨🇳" },
    { code: "cmn", name: "Mandarin Chinese", flag: "🇨🇳" },
    { code: "ja", name: "Japanese", flag: "🇯🇵" },
    { code: "ko", name: "Korean", flag: "🇰🇷" },
    { code: "mr", name: "Marathi", flag: "🇮🇳" },
    { code: "bn", name: "Bengali", flag: "🇮🇳" },
    { code: "gu", name: "Gujarati", flag: "🇮🇳" },
    { code: "ta", name: "Tamil", flag: "🇮🇳" },
    { code: "te", name: "Telugu", flag: "🇮🇳" },
    { code: "kn", name: "Kannada", flag: "🇮🇳" },
    { code: "ml", name: "Malayalam", flag: "🇮🇳" },
    { code: "pa", name: "Punjabi", flag: "🇮🇳" },
    { code: "ur", name: "Urdu", flag: "🇵🇰" },
    { code: "ne", name: "Nepali", flag: "🇳🇵" },
    { code: "es", name: "Spanish", flag: "🇪🇸" },
    { code: "fr", name: "French", flag: "🇫🇷" },
    { code: "de", name: "German", flag: "🇩🇪" },
    { code: "it", name: "Italian", flag: "🇮🇹" },
    { code: "pt", name: "Portuguese", flag: "🇵🇹" },
    { code: "ru", name: "Russian", flag: "🇷🇺" },
    { code: "ar", name: "Arabic", flag: "🇸🇦" },
    { code: "id", name: "Indonesian", flag: "🇮🇩" },
    { code: "vi", name: "Vietnamese", flag: "🇻🇳" },
    { code: "th", name: "Thai", flag: "🇹🇭" },
    { code: "tr", name: "Turkish", flag: "🇹🇷" },
    { code: "nl", name: "Dutch", flag: "🇳🇱" },
    { code: "pl", name: "Polish", flag: "🇵🇱" },
    { code: "sv", name: "Swedish", flag: "🇸🇪" },
    { code: "uk", name: "Ukrainian", flag: "🇺🇦" },
    { code: "ro", name: "Romanian", flag: "🇷🇴" },
    { code: "el", name: "Greek", flag: "🇬🇷" },
    { code: "he", name: "Hebrew", flag: "🇮🇱" }
  ],

  createDubbingJob: async (params, token) => {
    const edgeFunctionUrl = "https://pgvxbfvyzklqokehtxkx.supabase.co/functions/v1/create-dubbing";
    const res = await fetch(edgeFunctionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(params)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Dubbing request could not be initialized.");
    return data;
  },

  pollDubbingStatus: async (jobId, token) => {
    const edgeFunctionUrl = "https://pgvxbfvyzklqokehtxkx.supabase.co/functions/v1/check-dubbing";
    const res = await fetch(edgeFunctionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ jobId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Unable to poll job status.");
    return data;
  }
};

window.DubbingProvider = DubbingProvider;
