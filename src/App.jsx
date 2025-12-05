import React, { useState, useEffect, useRef } from 'react';
import { Play, Image as ImageIcon, Video, Loader2, Send, Settings, AlertCircle, CheckCircle2, Upload, X, ImagePlus, Layout, Smartphone, Frame, Plus, Sparkles, Wand2, Copy, ArrowRight } from 'lucide-react';

// --- Configuration ---
const AVAILABLE_MODELS = [
  {
    // Specific 'edit' endpoint based on previous context
    id: 'bytedance/seedream-v4/edit', 
    name: 'Seedream v4 Edit',
    type: 'image',
    description: 'ByteDance v4 Edit model. Requires reference images.',
    inputs: ['prompt', 'images']
  },
  {
    id: 'bytedance/seedream-v4.5/edit',
    name: 'Seedream v4.5 Edit',
    type: 'image',
    description: 'ByteDance v4.5 Edit model. Requires reference images.',
    inputs: ['prompt', 'images']
  },
  {
    id: 'google/nano-banana-pro/edit',
    name: 'Nano Banana Pro Edit',
    type: 'image',
    description: 'Google Nano Banana Pro Edit. Natural language image editing. Requires reference images.',
    inputs: ['prompt', 'images']
  },
  {
    id: 'google/nano-banana-pro/text-to-image',
    name: 'Nano Banana Pro',
    type: 'image',
    description: 'Advanced image generation & editing.',
    inputs: ['prompt', 'image']
  }
];

const AVAILABLE_DIMENSIONS = [
  { 
    id: '4:5', 
    label: '4:5', 
    width: 2765, 
    height: 3456, 
    icon: Frame,
    description: 'Portrait (2765 × 3456)' 
  },
  { 
    id: '9:16', 
    label: '9:16', 
    width: 2160, 
    height: 3840, 
    icon: Smartphone,
    description: 'Mobile (2160 × 3840)' 
  }
];

// Helper to safely get env vars across different environments (Preview vs Vite)
const getEnv = (key) => {
  // 1. Try Vite standard (import.meta.env)
  // We use a try/catch block because accessing import.meta can cause syntax errors in some bundlers
  try {
    // eslint-disable-next-line
    if (import.meta && import.meta.env && import.meta.env[`VITE_${key}`]) {
      return import.meta.env[`VITE_${key}`];
    }
  } catch (e) {
    // Ignore error if import.meta is not available
  }

  // 2. Try Standard Process Env (CRA/Next.js/Node)
  try {
    if (typeof process !== 'undefined' && process.env) {
      if (process.env[`REACT_APP_${key}`]) return process.env[`REACT_APP_${key}`];
      if (process.env[`VITE_${key}`]) return process.env[`VITE_${key}`];
    }
  } catch (e) {
    console.warn("Environment variable access failed", e);
  }
  return '';
};

export default function App() {
  // State
  const [apiKey, setApiKey] = useState('');
  const [geminiKey, setGeminiKey] = useState(''); 
  const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[0]);
  const [selectedDimension, setSelectedDimension] = useState(AVAILABLE_DIMENSIONS[0]);
  const [prompt, setPrompt] = useState('');
  const [resolution, setResolution] = useState('2k'); // For nano-banana-pro/edit: '1k', '2k', or '4k' (lowercase)
  
  // Support multiple images for Edit API
  const [referenceImages, setReferenceImages] = useState([]); 
  
  const [loading, setLoading] = useState(false);
  
  // Magic Prompt State
  const [showMagicModal, setShowMagicModal] = useState(false);
  const [magicImage, setMagicImage] = useState(null); 
  const [magicPromptOutput, setMagicPromptOutput] = useState(''); // Text result in modal
  const [magicLoading, setMagicLoading] = useState(false);

  const [status, setStatus] = useState(null); 
  const [resultUrl, setResultUrl] = useState(null);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);
  
  const fileInputRef = useRef(null);
  const magicFileInputRef = useRef(null);

  // Persistence & Environment Variables
  useEffect(() => {
    // 1. Try to load from LocalStorage first (user override)
    const storedWavespeedKey = localStorage.getItem('wavespeed_api_key');
    const storedGeminiKey = localStorage.getItem('gemini_api_key');

    // 2. If not in Storage, check Environment Variables
    const envWavespeedKey = getEnv('WAVESPEED_API_KEY');
    const envGeminiKey = getEnv('GEMINI_API_KEY');

    if (storedWavespeedKey) {
      setApiKey(storedWavespeedKey);
    } else if (envWavespeedKey) {
      setApiKey(envWavespeedKey);
    }

    if (storedGeminiKey) {
      setGeminiKey(storedGeminiKey);
    } else if (envGeminiKey) {
      setGeminiKey(envGeminiKey);
    }
  }, []);

  const handleSaveKey = (key) => {
    setApiKey(key);
    localStorage.setItem('wavespeed_api_key', key);
  };

  const handleSaveGeminiKey = (key) => {
    setGeminiKey(key);
    localStorage.setItem('gemini_api_key', key);
  };

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev]);
  };

  // --- Helper: Robust URL Extraction ---
  const extractResultUrl = (data) => {
    if (!data) return null;

    if (data.outputs && Array.isArray(data.outputs) && data.outputs.length > 0) return data.outputs[0];
    if (Array.isArray(data.output) && data.output.length > 0) return data.output[0];
    if (data.output) {
      if (typeof data.output === 'string') return data.output;
      if (data.output.url) return data.output.url;
    }
    if (data.images && Array.isArray(data.images) && data.images.length > 0) {
      const img = data.images[0];
      if (typeof img === 'string') return img;
      if (img.url) return img.url;
    }
    if (data.url) return data.url;
    if (data.data && data.data !== data) return extractResultUrl(data.data);

    return null;
  };

  // --- Image Handling (Main) ---
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    files.forEach(file => {
      if (file.size > 10 * 1024 * 1024) {
        setError(`File ${file.name} is too large. Skipping.`);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setReferenceImages(prev => [...prev, reader.result]);
        setError(null);
        addLog(`Loaded: ${file.name}`);
      };
      reader.readAsDataURL(file);
    });
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (indexToRemove) => {
    setReferenceImages(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  // --- Magic Prompt Logic ---
  const handleMagicImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setMagicImage({
        data: reader.result,
        mimeType: file.type
      });
      setMagicPromptOutput(''); // Clear previous result on new image
    };
    reader.readAsDataURL(file);
  };

  const generateMagicPrompt = async () => {
    if (!magicImage) return;
    if (!geminiKey) {
      setError("Please enter your Google Gemini API Key in settings first.");
      // Don't close modal, let user see error
      return;
    }

    setMagicLoading(true);
    
    try {
      const base64Content = magicImage.data.split(',')[1];
      const promptText = "Describe this image in detail to create a high-quality text-to-image prompt. Focus on subject, style, lighting, and composition. Keep it under 100 words.";
      
      // Use gemini-2.5-flash - stable, multimodal model with high token limits
      const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: promptText },
              { inlineData: { mimeType: magicImage.mimeType, data: base64Content } }
            ]
          }]
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `HTTP ${response.status}: Gemini API failed`);
      }

      const data = await response.json();
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (generatedText) {
        setMagicPromptOutput(generatedText.trim());
      } else {
        throw new Error("No text returned from Gemini");
      }

    } catch (err) {
      console.error(err);
      setError("Magic Prompt Failed: " + err.message);
    } finally {
      setMagicLoading(false);
    }
  };

  const useMagicPrompt = () => {
    setPrompt(magicPromptOutput);
    setShowMagicModal(false);
    setMagicImage(null);
    setMagicPromptOutput('');
  };

  // --- API Interaction (Wavespeed) ---
  const generateContent = async () => {
    if (!apiKey) {
      setError("Please enter your Wavespeed API Key first.");
      return;
    }
    if (selectedModel.id.includes('edit') && referenceImages.length === 0) {
      setError("The Edit model requires at least one reference image.");
      return;
    }
    if (!prompt && referenceImages.length === 0) {
      setError("Please enter a prompt or provide a reference image.");
      return;
    }

    setLoading(true);
    setError(null);
    setResultUrl(null);
    setStatus('queued');
    setLogs([]);
    addLog(`Starting job with model: ${selectedModel.name}`);
    if (selectedModel.id.includes('nano-banana-pro')) {
      addLog(`Aspect Ratio: ${selectedDimension.id}`);
      addLog(`Resolution: ${resolution}`);
    } else {
      addLog(`Dimensions: ${selectedDimension.width}x${selectedDimension.height}`);
    }

    try {
      let payload = {};

      if (selectedModel.id.includes('nano-banana-pro/edit')) {
        // Nano Banana Pro Edit requires specific format
        payload = {
          prompt: prompt || " ", 
          images: referenceImages,
          resolution: resolution, // '1k', '2k', or '4k' (lowercase)
          aspect_ratio: selectedDimension.id, // e.g., '4:5', '9:16'
          output_format: 'png',
          enable_sync_mode: false,
          enable_base64_output: false
        };
      } else if (selectedModel.id.includes('seedream')) {
        // Both seedream v4 and v4.5 use size parameter
        payload = {
          size: `${selectedDimension.width}*${selectedDimension.height}`,
          images: referenceImages, 
          prompt: prompt || " ", 
          enable_sync_mode: false,
          enable_base64_output: false
        };
      } else if (selectedModel.id.includes('nano-banana-pro')) {
        // Regular Nano Banana Pro generation
        const mainImage = referenceImages[0] || null;
        payload = {
          prompt: prompt || " ", 
          aspect_ratio: selectedDimension.id, // e.g., '4:5', '9:16'
          resolution: resolution, // '1k', '2k', or '4k' (lowercase)
          output_format: 'png',
          enable_sync_mode: false,
          enable_base64_output: false
        };
        if (mainImage) {
          payload.image = mainImage;
          payload.image_url = mainImage;
        }
      } else {
        // Fallback for other models
        const mainImage = referenceImages[0] || null;
        payload = {
          prompt: prompt || " ", 
          width: selectedDimension.width,
          height: selectedDimension.height,
          aspect_ratio: selectedDimension.id,
          input: {
              prompt: prompt || " ",
              width: selectedDimension.width,
              height: selectedDimension.height
          }
        };
        if (mainImage) {
            payload.image = mainImage;
            payload.image_url = mainImage;
            payload.input.image = mainImage;
        }
      }

      addLog("Sending payload...");

      const submitResponse = await fetch(`https://api.wavespeed.ai/api/v3/${selectedModel.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!submitResponse.ok) {
        const errData = await submitResponse.json();
        const errMsg = errData.detail || errData.message || errData.error || JSON.stringify(errData);
        throw new Error(errMsg);
      }

      const taskData = await submitResponse.json();
      console.log('Full API Response:', taskData);

      if (taskData.error) {
         throw new Error(taskData.error);
      }

      let pollTarget = null;
      
      if (taskData.urls && taskData.urls.get) {
        pollTarget = taskData.urls.get;
        addLog("Using provided polling URL.");
      } else {
        const taskId = taskData.id || 
                       taskData.task_id || 
                       taskData.request_id || 
                       taskData.job_id || 
                       (taskData.data && taskData.data.id);
        
        if (taskId) {
           pollTarget = `https://api.wavespeed.ai/api/v3/predictions/${taskId}/result`; 
           addLog(`Constructed polling URL for ID: ${taskId}`);
        }
      }

      const immediateOutput = extractResultUrl(taskData);
      if (immediateOutput) {
         setStatus('completed');
         setResultUrl(immediateOutput);
         addLog("Task completed instantly.");
         setLoading(false);
         return;
      }

      if (!pollTarget) {
        throw new Error("Could not determine polling URL or find immediate output.");
      }
      
      pollStatus(pollTarget);

    } catch (err) {
      console.error(err);
      setError(err.message);
      setLoading(false);
      setStatus('failed');
      addLog(`Error: ${err.message}`);
    }
  };

  const pollStatus = async (pollUrl) => {
    const startTime = Date.now();
    const MAX_DURATION = 5 * 60 * 1000; 
    let consecutiveErrors = 0;

    await new Promise(r => setTimeout(r, 2000));

    const check = async () => {
      if (Date.now() - startTime > MAX_DURATION) {
        setLoading(false);
        setError("Operation timed out. Task may still be processing on the server.");
        return;
      }

      try {
        const response = await fetch(pollUrl, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          }
        });

        if (!response.ok) {
          if (response.status === 404) {
             console.warn("Task 404, retrying...");
             throw new Error("Task not found yet");
          }
          throw new Error(`HTTP Error: ${response.status}`);
        }

        const data = await response.json();
        consecutiveErrors = 0; 
        
        const currentStatus = data.status || (data.data && data.data.status);
        setStatus(currentStatus);
        
        if (['succeeded', 'completed', 'SUCCESS'].includes(currentStatus)) {
          const output = extractResultUrl(data);
          if (output) {
            setResultUrl(output);
            addLog("Generation successful!");
          } else {
            setError("Task complete but output missing.");
          }
          setLoading(false);
          return; 
        } else if (['failed', 'canceled', 'FAILURE'].includes(currentStatus)) {
          setLoading(false);
          setError(data.error || "Task failed.");
          addLog("Task failed.");
          return; 
        } else {
          setTimeout(check, 3000); 
        }

      } catch (err) {
        consecutiveErrors++;
        if (consecutiveErrors >= 10) {
          setLoading(false);
          setError("Connection lost or task invalid.");
        } else {
          setTimeout(check, 3000);
        }
      }
    };
    check();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30 relative">
      
      {/* --- MAGIC PROMPT MODAL (SPLIT WINDOW) --- */}
      {showMagicModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col relative overflow-hidden">
            
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                <div className="flex items-center space-x-2">
                    <div className="p-1.5 bg-amber-500/10 rounded-lg">
                        <Sparkles className="w-5 h-5 text-amber-400" />
                    </div>
                    <h3 className="text-lg font-bold text-white">Magic Prompt Generator</h3>
                </div>
                <button 
                    onClick={() => { setShowMagicModal(false); setMagicImage(null); setMagicPromptOutput(''); }}
                    className="text-slate-500 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>

            {/* Split Content Area */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                
                {/* LEFT PANE: Input Image */}
                <div className="flex-1 p-6 border-r border-slate-800 flex flex-col bg-slate-900/50">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">1. Upload Image</div>
                    
                    <div className="flex-1 flex flex-col min-h-0">
                        {!magicImage ? (
                            <div 
                            onClick={() => magicFileInputRef.current?.click()}
                            className="flex-1 border-2 border-dashed border-slate-700 hover:border-amber-500/50 hover:bg-slate-800/50 rounded-xl cursor-pointer transition-all flex flex-col items-center justify-center group"
                            >
                            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg">
                                <Upload className="w-8 h-8 text-slate-400 group-hover:text-amber-400" />
                            </div>
                            <p className="text-sm font-medium text-slate-300">Click to upload image</p>
                            <p className="text-xs text-slate-500 mt-2">Supports JPG, PNG, WebP</p>
                            </div>
                        ) : (
                            <div className="relative h-full w-full rounded-xl overflow-hidden border border-slate-700 bg-black/40 group">
                                <img src={magicImage.data} alt="Magic input" className="w-full h-full object-contain" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <button 
                                        onClick={() => { setMagicImage(null); setMagicPromptOutput(''); }}
                                        className="bg-red-500/90 hover:bg-red-500 text-white px-4 py-2 rounded-lg backdrop-blur-md transition-all transform hover:scale-105 shadow-xl flex items-center"
                                    >
                                        <X className="w-4 h-4 mr-2" /> Change Image
                                    </button>
                                </div>
                            </div>
                        )}
                        <input 
                            type="file" 
                            ref={magicFileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleMagicImageSelect}
                        />
                    </div>

                    <div className="mt-6">
                        <button
                            onClick={generateMagicPrompt}
                            disabled={!magicImage || magicLoading}
                            className={`w-full py-4 px-4 rounded-xl flex items-center justify-center font-bold text-sm tracking-wide transition-all ${
                            !magicImage || magicLoading
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-lg shadow-amber-900/20 active:scale-[0.98]'
                            }`}
                        >
                            {magicLoading ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                Analyzing...
                            </>
                            ) : (
                            <>
                                <Wand2 className="w-5 h-5 mr-2" />
                                Generate Prompt
                            </>
                            )}
                        </button>
                    </div>
                </div>

                {/* RIGHT PANE: Output Text */}
                <div className="flex-1 p-6 flex flex-col bg-slate-950/30">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">2. Generated Prompt</div>
                    
                    <div className="flex-1 relative">
                        <textarea
                            value={magicPromptOutput}
                            onChange={(e) => setMagicPromptOutput(e.target.value)}
                            placeholder={magicLoading ? "Gemini is thinking..." : "Your generated prompt will appear here. You can edit it before using."}
                            className={`w-full h-full bg-slate-900 border ${magicPromptOutput ? 'border-amber-500/30' : 'border-slate-800'} rounded-xl p-4 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none transition-all`}
                            readOnly={magicLoading}
                        />
                        {magicLoading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-[1px] rounded-xl">
                                <div className="flex flex-col items-center">
                                    <Sparkles className="w-8 h-8 text-amber-400 animate-pulse mb-2" />
                                    <span className="text-xs text-amber-200 font-medium">Magic happening...</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-6 flex space-x-3">
                        <button
                            onClick={() => navigator.clipboard.writeText(magicPromptOutput)}
                            disabled={!magicPromptOutput}
                            className="px-4 py-4 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Copy to clipboard"
                        >
                            <Copy className="w-5 h-5" />
                        </button>
                        <button
                            onClick={useMagicPrompt}
                            disabled={!magicPromptOutput}
                            className="flex-1 py-4 px-4 rounded-xl flex items-center justify-center font-bold text-sm tracking-wide transition-all bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-800"
                        >
                            Use This Prompt <ArrowRight className="w-5 h-5 ml-2" />
                        </button>
                    </div>
                </div>

            </div>
          </div>
        </div>
      )}

      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Play className="w-5 h-5 text-white fill-current" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
              WaveSpeed UI
            </span>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center px-3 py-1.5 bg-slate-800/50 rounded-full border border-slate-700">
              <div className={`w-2 h-2 rounded-full mr-2 ${apiKey ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`} />
              <span className="text-xs font-medium text-slate-400">
                {apiKey ? 'API Connected' : 'No API Key'}
              </span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Panel: Controls */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* API Key Input */}
            <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl shadow-xl">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center">
                <Settings className="w-4 h-4 mr-2" /> Settings
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Wavespeed API Key</label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => handleSaveKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Google Gemini API Key</label>
                  <input
                    type="password"
                    value={geminiKey}
                    onChange={(e) => handleSaveGeminiKey(e.target.value)}
                    placeholder="AIza..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Generation Controls */}
            <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl shadow-xl">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center">
                <Play className="w-4 h-4 mr-2" /> Generate
              </h2>
              
              <div className="space-y-4">
                {/* Model Selector */}
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Select Model</label>
                  <div className="grid grid-cols-1 gap-2">
                    {AVAILABLE_MODELS.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => setSelectedModel(model)}
                        className={`flex items-center p-3 rounded-lg border transition-all text-left ${
                          selectedModel.id === model.id
                            ? 'bg-indigo-600/10 border-indigo-500/50 ring-1 ring-indigo-500/50'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className={`p-2 rounded-md mr-3 ${model.type === 'video' ? 'bg-pink-500/10 text-pink-400' : 'bg-blue-500/10 text-blue-400'}`}>
                          {model.type === 'video' ? <Video size={16} /> : <ImageIcon size={16} />}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-200">{model.name}</div>
                          <div className="text-xs text-slate-500">{model.description}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dimension/Aspect Ratio Selector */}
                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    {selectedModel.id.includes('nano-banana-pro/edit') ? 'Aspect Ratio' : 'Dimensions'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {AVAILABLE_DIMENSIONS.map((dim) => {
                      const Icon = dim.icon;
                      return (
                        <button
                          key={dim.id}
                          onClick={() => setSelectedDimension(dim)}
                          className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${
                            selectedDimension.id === dim.id
                              ? 'bg-indigo-600/10 border-indigo-500/50 ring-1 ring-indigo-500/50 text-indigo-400'
                              : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400'
                          }`}
                        >
                          <Icon className="w-5 h-5 mb-1" />
                          <span className="text-sm font-medium">{dim.label}</span>
                          {!selectedModel.id.includes('nano-banana-pro/edit') && (
                            <span className="text-[10px] text-slate-500 opacity-80">{dim.width} × {dim.height}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Resolution Selector - For nano-banana-pro models */}
                {selectedModel.id.includes('nano-banana-pro') && (
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Resolution</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['1k', '2k', '4k'].map((res) => (
                        <button
                          key={res}
                          onClick={() => setResolution(res)}
                          className={`py-2 px-3 rounded-lg border transition-all text-sm font-medium ${
                            resolution === res
                              ? 'bg-indigo-600/10 border-indigo-500/50 ring-1 ring-indigo-500/50 text-indigo-400'
                              : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400'
                          }`}
                        >
                          {res.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reference Images Input */}
                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    Reference Images 
                    {selectedModel.id.includes('edit') && <span className="text-indigo-400 ml-1">(Required for Edit)</span>}
                  </label>
                  
                  {/* Grid of uploaded images */}
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {referenceImages.map((img, idx) => (
                      <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-700 bg-black/20">
                        <img src={img} alt={`Reference ${idx + 1}`} className="w-full h-full object-cover" />
                        <button 
                          onClick={() => removeImage(idx)}
                          className="absolute top-1 right-1 bg-black/60 hover:bg-red-500/80 text-white p-0.5 rounded-full backdrop-blur-sm transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    
                    {/* Add Button */}
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="cursor-pointer border-2 border-dashed border-slate-800 rounded-lg aspect-square flex flex-col items-center justify-center hover:bg-slate-800/50 hover:border-indigo-500/50 transition-all group"
                    >
                      <Plus className="w-5 h-5 text-slate-600 group-hover:text-indigo-400" />
                      <span className="text-[10px] text-slate-600 group-hover:text-indigo-400 mt-1">Add</span>
                    </div>
                  </div>

                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    multiple // Allow multiple files
                    className="hidden" 
                  />
                  
                  <div className="text-[10px] text-slate-500 flex justify-between">
                    <span>{referenceImages.length} image(s) loaded</span>
                    {referenceImages.length > 0 && (
                      <button onClick={() => setReferenceImages([])} className="text-red-400/70 hover:text-red-400">Clear all</button>
                    )}
                  </div>
                </div>

                {/* Prompt Input */}
                <div>
                  <div className="flex justify-between items-end mb-1">
                    <label className="block text-xs text-slate-500">Prompt</label>
                    <button 
                      onClick={() => setShowMagicModal(true)}
                      className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center transition-colors bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/20"
                    >
                      <Sparkles className="w-3 h-3 mr-1" />
                      Magic Prompt
                    </button>
                  </div>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe what you want to see..."
                    className="w-full h-32 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all resize-none"
                  />
                </div>

                <button
                  onClick={generateContent}
                  disabled={loading || !apiKey}
                  className={`w-full py-3 px-4 rounded-xl flex items-center justify-center font-medium transition-all ${
                    loading
                      ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-lg shadow-indigo-500/20 active:scale-95'
                  }`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Run Generation
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Logs Console */}
            <div className="bg-black/40 border border-slate-800/50 p-4 rounded-xl h-48 overflow-y-auto font-mono text-xs">
              <div className="text-slate-500 mb-2 sticky top-0 bg-transparent uppercase tracking-wider text-[10px]">Activity Log</div>
              {logs.length === 0 && <span className="text-slate-700 italic">Ready to generate...</span>}
              {logs.map((log, i) => (
                <div key={i} className="text-slate-400 mb-1 border-b border-slate-800/30 pb-1 last:border-0">
                  {log}
                </div>
              ))}
            </div>

          </div>

          {/* Right Panel: Output */}
          <div className="lg:col-span-8">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl shadow-xl h-full min-h-[500px] flex flex-col relative overflow-hidden group">
              
              {/* Output Header */}
              <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-10 bg-gradient-to-b from-black/60 to-transparent">
                <div className="bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-xs font-mono text-slate-300">
                  OUTPUT PREVIEW
                </div>
                {status && (
                   <div className={`px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md flex items-center ${
                     status === 'succeeded' || status === 'completed' || status === 'SUCCESS' ? 'bg-green-500/20 border-green-500/30 text-green-400' :
                     status === 'failed' || status === 'FAILURE' ? 'bg-red-500/20 border-red-500/30 text-red-400' :
                     'bg-blue-500/20 border-blue-500/30 text-blue-400'
                   }`}>
                     {status === 'succeeded' || status === 'completed' || status === 'SUCCESS' ? <CheckCircle2 className="w-3 h-3 mr-1" /> : 
                      status === 'failed' || status === 'FAILURE' ? <AlertCircle className="w-3 h-3 mr-1" /> : 
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                     {status.toUpperCase()}
                   </div>
                )}
              </div>

              {/* Main Canvas Area */}
              <div className="flex-1 flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800/30 via-slate-900 to-slate-950">
                
                {error && (
                  <div className="text-center max-w-md p-6 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                    <h3 className="text-red-400 font-medium mb-1">Generation Failed</h3>
                    <p className="text-red-400/70 text-sm">{error}</p>
                  </div>
                )}

                {!resultUrl && !loading && !error && (
                  <div className="text-center opacity-30">
                     <div className="w-24 h-24 border-2 border-dashed border-slate-500 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                       <Play className="w-8 h-8 text-slate-500 ml-1" />
                     </div>
                     <p className="text-slate-400">Select a model and prompt to begin</p>
                  </div>
                )}

                {loading && (
                   <div className="text-center">
                     <div className="relative w-20 h-20 mx-auto mb-6">
                       <div className="absolute inset-0 border-4 border-indigo-500/30 rounded-full"></div>
                       <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                     </div>
                     <p className="text-indigo-400 animate-pulse font-medium">Generating your masterpiece...</p>
                     <p className="text-slate-500 text-xs mt-2">This may take a few moments</p>
                   </div>
                )}

                {resultUrl && !loading && (
                  <div className="relative w-full h-full flex items-center justify-center">
                    {selectedModel.type === 'video' || resultUrl.endsWith('.mp4') ? (
                      <video 
                        src={resultUrl} 
                        controls 
                        autoPlay 
                        loop 
                        className="max-w-full max-h-[70vh] rounded-lg shadow-2xl shadow-black/50 border border-slate-800"
                      />
                    ) : (
                      <img 
                        src={resultUrl} 
                        alt="Generated content" 
                        className="max-w-full max-h-[70vh] rounded-lg shadow-2xl shadow-black/50 border border-slate-800"
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          
        </div>
      </main>
    </div>
  );
}