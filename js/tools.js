/**
 * Registry of all 18 SUBBHU AI LABS Tools
 */
const AI_TOOLS = [
  { id: "v-enhancer", name: "AI Video Enhancer", category: "Enhance", type: "video", icon: "🎬", tag: "HD 4K" },
  { id: "p-enhancer", name: "AI Photo Enhancer", category: "Enhance", type: "photo", icon: "✨", tag: "Popular" },
  { id: "img-upscale", name: "Image Upscaler", category: "Upscale", type: "photo", icon: "🔍", tag: "8x Res" },
  { id: "vid-upscale", name: "Video Upscaler", category: "Upscale", type: "video", icon: "📺", tag: "60 FPS" },
  { id: "bg-remove", name: "Background Remover", category: "Remove", type: "photo", icon: "✂️", tag: "Alpha" },
  { id: "obj-remove", name: "Object Remover", category: "Remove", type: "photo", icon: "🧹", tag: "Inpaint" },
  { id: "face-enhance", name: "Face Enhancer", category: "Beauty", type: "photo", icon: "👤", tag: "Pro Skin" },
  { id: "p-restore", name: "Photo Restoration", category: "Restore", type: "photo", icon: "🕰️", tag: "Vintage" },
  { id: "v-restore", name: "Video Restoration", category: "Restore", type: "video", icon: "🎞️", tag: "Denoise" },
  { id: "img-gen", name: "AI Image Generator", category: "Gen", type: "gen", icon: "🎨", tag: "Diffusion" },
  { id: "vid-gen", name: "AI Video Generator", category: "Gen", type: "gen", icon: "📽️", tag: "Motion" },
  { id: "img2vid", name: "Image to Video", category: "Gen", type: "photo", icon: "🌊", tag: "Dynamic" },
  { id: "txt2img", name: "Text to Image", category: "Gen", type: "gen", icon: "✍️", tag: "Fast" },
  { id: "txt2vid", name: "Text to Video", category: "Gen", type: "gen", icon: "📝", tag: "Story" },
  { id: "vid-compress", name: "Video Compressor", category: "Utility", type: "video", icon: "📦", tag: "No Loss" },
  { id: "img-compress", name: "Image Compressor", category: "Utility", type: "photo", icon: "🗜️", tag: "WebP" },
  { id: "vid-convert", name: "Video Converter", category: "Utility", type: "video", icon: "🔄", tag: "MP4/MKV" },
  { id: "img-convert", name: "Image Converter", category: "Utility", type: "photo", icon: "🖼️", tag: "PNG/JPG" }
];

window.AI_TOOLS = AI_TOOLS;
