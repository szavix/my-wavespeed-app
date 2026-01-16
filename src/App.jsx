import React, { useState, useEffect, useRef } from 'react';
import { Play, Image as ImageIcon, Video, Loader2, Send, Settings, AlertCircle, CheckCircle2, Upload, X, ImagePlus, Layout, Smartphone, Frame, Plus, Instagram, Palette, Film, RotateCcw } from 'lucide-react';

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
  },
  {
    id: 'bytedance/seedance-v1-pro-fast/image-to-video',
    name: 'Seedance v1 Pro Fast',
    type: 'video',
    description: 'ByteDance image-to-video model. Requires reference image.',
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
  // Section selection state
  const [selectedSection, setSelectedSection] = useState('custom');
  
  // State
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[0]);
  const [selectedDimension, setSelectedDimension] = useState(AVAILABLE_DIMENSIONS[0]);
  const [prompt, setPrompt] = useState('');
  const [resolution, setResolution] = useState('2k'); // For nano-banana-pro/edit: '1k', '2k', or '4k' (lowercase)
  
  // Video generation parameters for seedance
  const [videoDuration, setVideoDuration] = useState(5);
  const [videoResolution, setVideoResolution] = useState('480p');
  const [cameraFixed, setCameraFixed] = useState(false);
  const [seed, setSeed] = useState(-1);
  
  // Support multiple images for Edit API
  const [referenceImages, setReferenceImages] = useState([]); 
  
  const [loading, setLoading] = useState(false);

  const [status, setStatus] = useState(null); 
  const [resultUrl, setResultUrl] = useState(null);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);
  
  // IG Picture specific state
  const [igFirstImage, setIgFirstImage] = useState(null);
  const [igSecondImages, setIgSecondImages] = useState([]);
  const [igSelectedModel, setIgSelectedModel] = useState('google/nano-banana-pro/edit');
  const [igAppendText, setIgAppendText] = useState({ blackNails: false, blackPhoneCase: false }); // Track both options independently
  const [igPrompt, setIgPrompt] = useState('refer to face and hair from the first image, and the pose and background from the second image.'); // Editable prompt
  const [igResults, setIgResults] = useState([]); // Array of result URLs from multiple jobs
  const [igLoading, setIgLoading] = useState(false);
  const [igJobStatuses, setIgJobStatuses] = useState([]); // Array of status objects for each job
  
  // Preset Picture specific state
  const [presetPrompts] = useState([
    {
      title: 'Mirror, squatting, phone selfie',
      prompt: 'Refer to an image \nA young woman taking a mirror selfie while squatting in the minimal room from the second image. She\'s wearing outfit from the attached images. Black nails. Black phone case. She is looking directly into the camera. amateur candid photo, iPhone style. Light grain adding realism to the photo'
    },
    {
      title: 'Feet spreading sitting',
      prompt: 'Refer to an image \nA young woman sitting, posing confidently leaned against a wall, with her legs separated. She\'s wearing a black tshirt and black jeans, barefoot. Black nails and toenails. She is looking directly into the camera. iPhone style. Woman is in the centre of the image. Very Close distance. The room has light wooden floors, and neutral wall. Feet in the foreground. POV in front of feet'
    },
    {
      title: 'Bathroom ass',
      prompt: 'Refer to an image \nA young woman takes a mirror selfie in a minimalistic bathroom. She is wearing outfit from the attached images. Her nails are painted black, and she holds a black smartphone in one hand while the other hand rests on her hip. She is standing sideways, exposing her toned ass. The lighting is soft and clean, highlighting her pale skin tone and the white tiled background. Amateur style, iPhone photo style. Medium size boobs'
    },
    {
      title: 'Bed selfie topless',
      prompt: 'Refer to an image \nA young woman takes a close up bed selfie while laying. She is topless and wearing red latex thongs. She is looking directly into the camera. One of her hands is playing with her hair. She\'s sticking her tongue out black nails. Amateur style. iphone photo style. The angle is from the top as if she is holding the camera with one hand. The background shows white duvet. dim lighting, with camera iphone flash effect.'
    },
    {
      title: 'Sitting bed posing',
      prompt: 'Refer to an image \nA young woman sitting, posing confidently on the bed. She\'s wearing outfit from the attached images. Black nails. She is looking directly into the camera. amateur candid photo, iPhone style. Light grain adding realism to the photo. Woman is in the centre of the image. Very Close distance.'
    },
    {
      title: 'Laying on stomach, bed',
      prompt: 'refer to woman from the attached image. Close up selfie of a young woman lying on her stomach on a bed in a dimly lit bedroom. Her lips are slightly parted as she gently bites her lower lip, giving a playful, dreamy expression. She\'s looking into the camera. She wears a black top and a delicate necklace. Her bare feet are lifted behind her, relaxed and slightly crossed, soles visible in the background. Cozy bedroom setting with dim lighting'
    },
    {
      title: 'After shower, nude',
      prompt: 'Realistic iPhone mirror selfie, young woman from the first image. She has a wet hair like she just took a shower. She\'s topless and her shaved vagina is visible. small tiled bathroom from the third image, natural body pose, raw smartphone photography aesthetic. Black nails. Black phone case. Visible water droplets on her skin as if she just took a shower'
    },
    {
      title: 'feet POV bed',
      prompt: 'refer to person from the first image. A young woman lays on her stomach with her feet in the pose. Her soles are emphasised on the image. She wears black pyjama. In the foreground, her bare feet are gently extended forward. Sharp details on her feet. POV in front of feet. Black nails.'
    }
  ]); // Array of { title: string, prompt: string }
  const [selectedPresetTitle, setSelectedPresetTitle] = useState('');
  const [presetPrompt, setPresetPrompt] = useState(''); // Editable prompt
  const [presetSelectedModel, setPresetSelectedModel] = useState('google/nano-banana-pro/edit');
  const [presetReferenceImages, setPresetReferenceImages] = useState([]);
  const [presetLoading, setPresetLoading] = useState(false);
  const [presetStatus, setPresetStatus] = useState(null);
  const [presetResultUrl, setPresetResultUrl] = useState(null);
  const [presetError, setPresetError] = useState(null);
  
  const fileInputRef = useRef(null);
  const igFirstImageRef = useRef(null);
  const igSecondImagesRef = useRef(null);
  const presetFileInputRef = useRef(null);

  // Persistence & Environment Variables
  useEffect(() => {
    // 1. Try to load from LocalStorage first (user override)
    const storedWavespeedKey = localStorage.getItem('wavespeed_api_key');

    // 2. If not in Storage, check Environment Variables
    const envWavespeedKey = getEnv('WAVESPEED_API_KEY');

    if (storedWavespeedKey) {
      setApiKey(storedWavespeedKey);
    } else if (envWavespeedKey) {
      setApiKey(envWavespeedKey);
    }
  }, []);

  const handleSaveKey = (key) => {
    setApiKey(key);
    localStorage.setItem('wavespeed_api_key', key);
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
    if (selectedModel.id.includes('seedance') && referenceImages.length === 0) {
      setError("Seedance model requires a reference image.");
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
    } else if (selectedModel.id.includes('seedance')) {
      addLog(`Video Resolution: ${videoResolution}`);
      addLog(`Duration: ${videoDuration}s`);
      addLog(`Camera Fixed: ${cameraFixed}`);
      addLog(`Seed: ${seed}`);
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
      } else if (selectedModel.id.includes('seedance')) {
        // Seedance image-to-video model
        const mainImage = referenceImages[0];
        payload = {
          camera_fixed: cameraFixed,
          duration: videoDuration,
          image: mainImage,
          prompt: prompt || " ",
          resolution: videoResolution,
          seed: seed
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

  // --- IG Picture Handlers ---
  const handleIgFirstImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
      setError(`File ${file.name} is too large.`);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setIgFirstImage(reader.result);
      setError(null);
    };
    reader.readAsDataURL(file);
    
    if (igFirstImageRef.current) igFirstImageRef.current.value = '';
  };

  const handleIgSecondImagesUpload = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const newImages = [];
    files.forEach(file => {
      if (file.size > 10 * 1024 * 1024) {
        setError(`File ${file.name} is too large. Skipping.`);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        newImages.push(reader.result);
        if (newImages.length === files.length) {
          setIgSecondImages(prev => [...prev, ...newImages]);
          setError(null);
        }
      };
      reader.readAsDataURL(file);
    });
    
    if (igSecondImagesRef.current) igSecondImagesRef.current.value = '';
  };

  const removeIgSecondImage = (indexToRemove) => {
    setIgSecondImages(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  // Build default prompt based on append text options
  const buildDefaultIgPrompt = () => {
    let basePrompt = "refer to face and hair from the first image, and the pose and background from the second image.";
    const appendParts = [];
    if (igAppendText.blackNails) {
      appendParts.push("black nails");
    }
    if (igAppendText.blackPhoneCase) {
      appendParts.push("black phone case");
    }
    if (appendParts.length > 0) {
      basePrompt += ` ${appendParts.join(", ")}.`;
    }
    return basePrompt;
  };

  const resetIgPromptToDefault = () => {
    setIgPrompt(buildDefaultIgPrompt());
  };

  const updatePromptFromAppendText = (appendTextState) => {
    const basePrompt = "refer to face and hair from the first image, and the pose and background from the second image.";
    const appendParts = [];
    if (appendTextState.blackNails) {
      appendParts.push("black nails");
    }
    if (appendTextState.blackPhoneCase) {
      appendParts.push("black phone case");
    }
    if (appendParts.length > 0) {
      setIgPrompt(`${basePrompt} ${appendParts.join(", ")}.`);
    } else {
      setIgPrompt(basePrompt);
    }
  };

  const toggleBlackNails = () => {
    const newAppendText = { ...igAppendText, blackNails: !igAppendText.blackNails };
    setIgAppendText(newAppendText);
    updatePromptFromAppendText(newAppendText);
  };

  const toggleBlackPhoneCase = () => {
    const newAppendText = { ...igAppendText, blackPhoneCase: !igAppendText.blackPhoneCase };
    setIgAppendText(newAppendText);
    updatePromptFromAppendText(newAppendText);
  };


  const generateIgPicture = async () => {
    if (!apiKey) {
      setError("Please enter your Wavespeed API Key first.");
      return;
    }
    if (!igFirstImage) {
      setError("Please upload the first image.");
      return;
    }
    if (igSecondImages.length === 0) {
      setError("Please upload at least one second image.");
      return;
    }

    setIgLoading(true);
    setError(null);
    setIgResults([]);
    setIgJobStatuses([]);
    addLog(`Starting ${igSecondImages.length} IG picture job(s)...`);

    // Use the editable prompt
    const basePrompt = igPrompt || buildDefaultIgPrompt();

    // Get the selected model
    const model = AVAILABLE_MODELS.find(m => m.id === igSelectedModel);
    if (!model) {
      setError("Invalid model selected.");
      setIgLoading(false);
      return;
    }

    // Create jobs for each second image
    const jobs = igSecondImages.map((secondImage, index) => {
      const images = [igFirstImage, secondImage];
      
      let payload = {};
      if (igSelectedModel.includes('nano-banana-pro/edit')) {
        payload = {
          prompt: basePrompt,
          images: images,
          resolution: resolution,
          aspect_ratio: selectedDimension.id,
          output_format: 'png',
          enable_sync_mode: false,
          enable_base64_output: false
        };
      } else if (igSelectedModel.includes('seedream')) {
        payload = {
          size: `${selectedDimension.width}*${selectedDimension.height}`,
          images: images,
          prompt: basePrompt,
          enable_sync_mode: false,
          enable_base64_output: false
        };
      }

      return { payload, index };
    });

    // Initialize job statuses
    const initialStatuses = jobs.map((_, index) => ({
      index,
      status: 'queued',
      resultUrl: null,
      error: null
    }));
    setIgJobStatuses(initialStatuses);

    // Submit all jobs
    try {
      const jobPromises = jobs.map(async ({ payload, index }) => {
        try {
          const submitResponse = await fetch(`https://api.wavespeed.ai/api/v3/${igSelectedModel}`, {
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
          
          if (taskData.error) {
            throw new Error(taskData.error);
          }

          let pollTarget = null;
          
          if (taskData.urls && taskData.urls.get) {
            pollTarget = taskData.urls.get;
          } else {
            const taskId = taskData.id || 
                           taskData.task_id || 
                           taskData.request_id || 
                           taskData.job_id || 
                           (taskData.data && taskData.data.id);
            
            if (taskId) {
              pollTarget = `https://api.wavespeed.ai/api/v3/predictions/${taskId}/result`;
            }
          }

          const immediateOutput = extractResultUrl(taskData);
          if (immediateOutput) {
            setIgJobStatuses(prev => prev.map((s, i) => 
              i === index ? { ...s, status: 'completed', resultUrl: immediateOutput } : s
            ));
            setIgResults(prev => {
              const newResults = [...prev];
              newResults[index] = immediateOutput;
              return newResults;
            });
            addLog(`Job ${index + 1} completed instantly.`);
            return;
          }

          if (!pollTarget) {
            throw new Error("Could not determine polling URL.");
          }

          // Poll for this specific job
          await pollIgJobStatus(pollTarget, index);

        } catch (err) {
          console.error(`Job ${index + 1} error:`, err);
          setIgJobStatuses(prev => prev.map((s, i) => 
            i === index ? { ...s, status: 'failed', error: err.message } : s
          ));
          addLog(`Job ${index + 1} failed: ${err.message}`);
        }
      });

      await Promise.all(jobPromises);
      addLog("All jobs completed.");
      
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setIgLoading(false);
    }
  };

  const pollIgJobStatus = async (pollUrl, jobIndex) => {
    const startTime = Date.now();
    const MAX_DURATION = 5 * 60 * 1000;
    let consecutiveErrors = 0;

    await new Promise(r => setTimeout(r, 2000));

    const check = async () => {
      if (Date.now() - startTime > MAX_DURATION) {
        setIgJobStatuses(prev => prev.map((s, i) => 
          i === jobIndex ? { ...s, status: 'failed', error: 'Operation timed out' } : s
        ));
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
            throw new Error("Task not found yet");
          }
          throw new Error(`HTTP Error: ${response.status}`);
        }

        const data = await response.json();
        consecutiveErrors = 0;
        
        const currentStatus = data.status || (data.data && data.data.status);
        setIgJobStatuses(prev => prev.map((s, i) => 
          i === jobIndex ? { ...s, status: currentStatus } : s
        ));
        
        if (['succeeded', 'completed', 'SUCCESS'].includes(currentStatus)) {
          const output = extractResultUrl(data);
          if (output) {
            setIgJobStatuses(prev => prev.map((s, i) => 
              i === jobIndex ? { ...s, status: 'completed', resultUrl: output } : s
            ));
            setIgResults(prev => {
              const newResults = [...prev];
              newResults[jobIndex] = output;
              return newResults;
            });
            addLog(`Job ${jobIndex + 1} generation successful!`);
          } else {
            setIgJobStatuses(prev => prev.map((s, i) => 
              i === jobIndex ? { ...s, status: 'failed', error: 'Output missing' } : s
            ));
          }
          return;
        } else if (['failed', 'canceled', 'FAILURE'].includes(currentStatus)) {
          setIgJobStatuses(prev => prev.map((s, i) => 
            i === jobIndex ? { ...s, status: 'failed', error: data.error || 'Task failed' } : s
          ));
          return;
        } else {
          setTimeout(check, 3000);
        }

      } catch (err) {
        consecutiveErrors++;
        if (consecutiveErrors >= 10) {
          setIgJobStatuses(prev => prev.map((s, i) => 
            i === jobIndex ? { ...s, status: 'failed', error: 'Connection lost' } : s
          ));
        } else {
          setTimeout(check, 3000);
        }
      }
    };
    check();
  };

  // --- Preset Picture Handlers ---
  const handlePresetSelect = (title) => {
    setSelectedPresetTitle(title);
    const preset = presetPrompts.find(p => p.title === title);
    if (preset) {
      setPresetPrompt(preset.prompt);
    }
  };

  const resetPresetPromptToDefault = () => {
    const preset = presetPrompts.find(p => p.title === selectedPresetTitle);
    if (preset) {
      setPresetPrompt(preset.prompt);
    }
  };

  const handlePresetImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    files.forEach(file => {
      if (file.size > 10 * 1024 * 1024) {
        setPresetError(`File ${file.name} is too large. Skipping.`);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setPresetReferenceImages(prev => [...prev, reader.result]);
        setPresetError(null);
        addLog(`Loaded: ${file.name}`);
      };
      reader.readAsDataURL(file);
    });
    
    if (presetFileInputRef.current) presetFileInputRef.current.value = '';
  };

  const removePresetImage = (indexToRemove) => {
    setPresetReferenceImages(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const generatePresetPicture = async () => {
    if (!apiKey) {
      setPresetError("Please enter your Wavespeed API Key first.");
      return;
    }
    if (presetSelectedModel.includes('edit') && presetReferenceImages.length === 0) {
      setPresetError("The Edit model requires at least one reference image.");
      return;
    }
    if (!presetPrompt && presetReferenceImages.length === 0) {
      setPresetError("Please enter a prompt or provide a reference image.");
      return;
    }

    setPresetLoading(true);
    setPresetError(null);
    setPresetResultUrl(null);
    setPresetStatus('queued');
    setLogs([]);
    addLog(`Starting job with model: ${presetSelectedModel.includes('nano-banana-pro') ? 'Nano Banana Pro Edit' : 'Seedream v4.5 Edit'}`);

    try {
      let payload = {};

      if (presetSelectedModel.includes('nano-banana-pro/edit')) {
        payload = {
          prompt: presetPrompt || " ", 
          images: presetReferenceImages,
          resolution: resolution,
          aspect_ratio: selectedDimension.id,
          output_format: 'png',
          enable_sync_mode: false,
          enable_base64_output: false
        };
      } else if (presetSelectedModel.includes('seedream')) {
        payload = {
          size: `${selectedDimension.width}*${selectedDimension.height}`,
          images: presetReferenceImages, 
          prompt: presetPrompt || " ", 
          enable_sync_mode: false,
          enable_base64_output: false
        };
      }

      addLog("Sending payload...");

      const submitResponse = await fetch(`https://api.wavespeed.ai/api/v3/${presetSelectedModel}`, {
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
         setPresetStatus('completed');
         setPresetResultUrl(immediateOutput);
         addLog("Task completed instantly.");
         setPresetLoading(false);
         return;
      }

      if (!pollTarget) {
        throw new Error("Could not determine polling URL or find immediate output.");
      }
      
      pollPresetStatus(pollTarget);

    } catch (err) {
      console.error(err);
      setPresetError(err.message);
      setPresetLoading(false);
      setPresetStatus('failed');
      addLog(`Error: ${err.message}`);
    }
  };

  const pollPresetStatus = async (pollUrl) => {
    const startTime = Date.now();
    const MAX_DURATION = 5 * 60 * 1000; 
    let consecutiveErrors = 0;

    await new Promise(r => setTimeout(r, 2000));

    const check = async () => {
      if (Date.now() - startTime > MAX_DURATION) {
        setPresetLoading(false);
        setPresetError("Operation timed out. Task may still be processing on the server.");
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
        setPresetStatus(currentStatus);
        
        if (['succeeded', 'completed', 'SUCCESS'].includes(currentStatus)) {
          const output = extractResultUrl(data);
          if (output) {
            setPresetResultUrl(output);
            addLog("Generation successful!");
          } else {
            setPresetError("Task complete but output missing.");
          }
          setPresetLoading(false);
          return; 
        } else if (['failed', 'canceled', 'FAILURE'].includes(currentStatus)) {
          setPresetLoading(false);
          setPresetError(data.error || "Task failed.");
          addLog("Task failed.");
          return; 
        } else {
          setTimeout(check, 3000); 
        }

      } catch (err) {
        consecutiveErrors++;
        if (consecutiveErrors >= 10) {
          setPresetLoading(false);
          setPresetError("Connection lost or task invalid.");
        } else {
          setTimeout(check, 3000);
        }
      }
    };
    check();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30 relative">
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

      {/* Sidepanel */}
      <div className="fixed left-0 top-16 bottom-0 w-64 bg-slate-900/80 backdrop-blur-md border-r border-slate-800 z-40 overflow-y-auto">
        <div className="p-4 space-y-2">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-2">Sections</div>
          {[
            { id: 'ig-picture', label: 'IG Picture', icon: Instagram },
            { id: 'preset-picture', label: 'Preset Picture', icon: Palette },
            { id: 'video', label: 'Video', icon: Film },
            { id: 'custom', label: 'Custom', icon: Settings }
          ].map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setSelectedSection(section.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all text-left ${
                  selectedSection === section.id
                    ? 'bg-indigo-600/20 border border-indigo-500/50 text-indigo-400'
                    : 'bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm font-medium">{section.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <main className="ml-64 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {selectedSection === 'custom' ? (
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

                {/* Dimension/Aspect Ratio Selector - Hidden for seedance */}
                {!selectedModel.id.includes('seedance') && (
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
                )}

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

                {/* Video Parameters - For seedance model */}
                {selectedModel.id.includes('seedance') && (
                  <>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Video Resolution</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['480p', '720p', '1080p'].map((res) => (
                          <button
                            key={res}
                            onClick={() => setVideoResolution(res)}
                            className={`py-2 px-3 rounded-lg border transition-all text-sm font-medium ${
                              videoResolution === res
                                ? 'bg-indigo-600/10 border-indigo-500/50 ring-1 ring-indigo-500/50 text-indigo-400'
                                : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400'
                            }`}
                          >
                            {res}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Duration (seconds)</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={videoDuration}
                        onChange={(e) => setVideoDuration(parseInt(e.target.value) || 5)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="cameraFixed"
                        checked={cameraFixed}
                        onChange={(e) => setCameraFixed(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 focus:ring-2"
                      />
                      <label htmlFor="cameraFixed" className="text-xs text-slate-400 cursor-pointer">
                        Camera Fixed
                      </label>
                    </div>

                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Seed (-1 for random)</label>
                      <input
                        type="number"
                        value={seed}
                        onChange={(e) => setSeed(parseInt(e.target.value) || -1)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                      />
                    </div>
                  </>
                )}

                {/* Reference Images Input */}
                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    Reference Images 
                    {selectedModel.id.includes('edit') && <span className="text-indigo-400 ml-1">(Required for Edit)</span>}
                    {selectedModel.id.includes('seedance') && <span className="text-indigo-400 ml-1">(Required)</span>}
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
                  <label className="block text-xs text-slate-500 mb-1">Prompt</label>
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
        ) : selectedSection === 'ig-picture' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Panel: IG Picture Controls */}
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
                </div>
              </div>

              {/* IG Picture Generation Controls */}
              <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl shadow-xl">
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center">
                  <Instagram className="w-4 h-4 mr-2" /> IG Picture
                </h2>
                
                <div className="space-y-4">
                  {/* Model Selector */}
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Select Model</label>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { id: 'google/nano-banana-pro/edit', name: 'Nano Banana Pro Edit' },
                        { id: 'bytedance/seedream-v4.5/edit', name: 'Seedream v4.5 Edit' }
                      ].map((model) => (
                        <button
                          key={model.id}
                          onClick={() => setIgSelectedModel(model.id)}
                          className={`flex items-center p-3 rounded-lg border transition-all text-left ${
                            igSelectedModel === model.id
                              ? 'bg-indigo-600/10 border-indigo-500/50 ring-1 ring-indigo-500/50'
                              : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="p-2 rounded-md mr-3 bg-blue-500/10 text-blue-400">
                            <ImageIcon size={16} />
                          </div>
                          <div className="text-sm font-medium text-slate-200">{model.name}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dimension Selector */}
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Aspect Ratio</label>
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
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Resolution Selector */}
                  {igSelectedModel.includes('nano-banana-pro') && (
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

                  {/* Prompt Display and Append Options */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs text-slate-500">Prompt</label>
                      <button
                        onClick={resetIgPromptToDefault}
                        className="text-xs text-slate-400 hover:text-indigo-400 flex items-center gap-1 transition-colors"
                        title="Reset to default prompt"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Reset
                      </button>
                    </div>
                    <textarea
                      value={igPrompt}
                      onChange={(e) => setIgPrompt(e.target.value)}
                      placeholder="Enter your prompt..."
                      className="w-full h-24 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all resize-none mb-2"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={toggleBlackNails}
                        className={`flex-1 py-2 px-3 rounded-lg border transition-all text-sm font-medium ${
                          igAppendText.blackNails
                            ? 'bg-indigo-600/10 border-indigo-500/50 ring-1 ring-indigo-500/50 text-indigo-400'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400'
                        }`}
                      >
                        Black Nails
                      </button>
                      <button
                        onClick={toggleBlackPhoneCase}
                        className={`flex-1 py-2 px-3 rounded-lg border transition-all text-sm font-medium ${
                          igAppendText.blackPhoneCase
                            ? 'bg-indigo-600/10 border-indigo-500/50 ring-1 ring-indigo-500/50 text-indigo-400'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400'
                        }`}
                      >
                        Black Phone Case
                      </button>
                    </div>
                  </div>

                  {/* First Image Upload (Single) */}
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">First Image (Single)</label>
                    {!igFirstImage ? (
                      <div 
                        onClick={() => igFirstImageRef.current?.click()}
                        className="border-2 border-dashed border-slate-800 rounded-lg aspect-square flex flex-col items-center justify-center hover:bg-slate-800/50 hover:border-indigo-500/50 transition-all cursor-pointer group"
                      >
                        <Upload className="w-8 h-8 text-slate-600 group-hover:text-indigo-400 mb-2" />
                        <span className="text-xs text-slate-500 group-hover:text-indigo-400">Click to upload</span>
                      </div>
                    ) : (
                      <div className="relative aspect-square rounded-lg overflow-hidden border border-slate-700 bg-black/20 group">
                        <img src={igFirstImage} alt="First image" className="w-full h-full object-cover" />
                        <button 
                          onClick={() => setIgFirstImage(null)}
                          className="absolute top-1 right-1 bg-black/60 hover:bg-red-500/80 text-white p-1 rounded-full backdrop-blur-sm transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    <input 
                      type="file" 
                      ref={igFirstImageRef}
                      onChange={handleIgFirstImageUpload}
                      accept="image/*"
                      className="hidden" 
                    />
                  </div>

                  {/* Second Images Upload (Multiple) */}
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Second Images (Multiple)</label>
                    
                    {/* Grid of uploaded images */}
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      {igSecondImages.map((img, idx) => (
                        <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-700 bg-black/20">
                          <img src={img} alt={`Second ${idx + 1}`} className="w-full h-full object-cover" />
                          <button 
                            onClick={() => removeIgSecondImage(idx)}
                            className="absolute top-1 right-1 bg-black/60 hover:bg-red-500/80 text-white p-0.5 rounded-full backdrop-blur-sm transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      
                      {/* Add Button */}
                      <div 
                        onClick={() => igSecondImagesRef.current?.click()}
                        className="cursor-pointer border-2 border-dashed border-slate-800 rounded-lg aspect-square flex flex-col items-center justify-center hover:bg-slate-800/50 hover:border-indigo-500/50 transition-all group"
                      >
                        <Plus className="w-5 h-5 text-slate-600 group-hover:text-indigo-400" />
                        <span className="text-[10px] text-slate-600 group-hover:text-indigo-400 mt-1">Add</span>
                      </div>
                    </div>

                    <input 
                      type="file" 
                      ref={igSecondImagesRef}
                      onChange={handleIgSecondImagesUpload}
                      accept="image/*"
                      multiple
                      className="hidden" 
                    />
                    
                    <div className="text-[10px] text-slate-500 flex justify-between">
                      <span>{igSecondImages.length} image(s) loaded</span>
                      {igSecondImages.length > 0 && (
                        <button onClick={() => setIgSecondImages([])} className="text-red-400/70 hover:text-red-400">Clear all</button>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={generateIgPicture}
                    disabled={igLoading || !apiKey || !igFirstImage || igSecondImages.length === 0}
                    className={`w-full py-3 px-4 rounded-xl flex items-center justify-center font-medium transition-all ${
                      igLoading || !apiKey || !igFirstImage || igSecondImages.length === 0
                        ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-lg shadow-indigo-500/20 active:scale-95'
                    }`}
                  >
                    {igLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing {igSecondImages.length} job(s)...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Generate {igSecondImages.length} Image(s)
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
                </div>

                {/* Main Canvas Area */}
                <div className="flex-1 flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800/30 via-slate-900 to-slate-950 overflow-y-auto">
                  
                  {error && (
                    <div className="text-center max-w-md p-6 bg-red-500/10 border border-red-500/20 rounded-xl">
                      <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                      <h3 className="text-red-400 font-medium mb-1">Generation Failed</h3>
                      <p className="text-red-400/70 text-sm">{error}</p>
                    </div>
                  )}

                  {igResults.length === 0 && !igLoading && !error && (
                    <div className="text-center opacity-30">
                      <div className="w-24 h-24 border-2 border-dashed border-slate-500 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                        <Instagram className="w-8 h-8 text-slate-500" />
                      </div>
                      <p className="text-slate-400">Upload images and generate to see results</p>
                    </div>
                  )}

                  {igLoading && (
                    <div className="text-center">
                      <div className="relative w-20 h-20 mx-auto mb-6">
                        <div className="absolute inset-0 border-4 border-indigo-500/30 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                      <p className="text-indigo-400 animate-pulse font-medium">Generating {igSecondImages.length} image(s)...</p>
                      <p className="text-slate-500 text-xs mt-2">This may take a few moments</p>
                    </div>
                  )}

                  {igResults.length > 0 && (
                    <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                      {igResults.map((resultUrl, index) => (
                        resultUrl && (
                          <div key={index} className="relative">
                            <div className="absolute -top-2 -right-2 z-10">
                              {igJobStatuses[index]?.status === 'completed' ? (
                                <div className="bg-green-500/20 border border-green-500/30 text-green-400 px-2 py-1 rounded-full text-xs font-bold flex items-center">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Done
                                </div>
                              ) : igJobStatuses[index]?.status === 'failed' ? (
                                <div className="bg-red-500/20 border border-red-500/30 text-red-400 px-2 py-1 rounded-full text-xs font-bold flex items-center">
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  Failed
                                </div>
                              ) : (
                                <div className="bg-blue-500/20 border border-blue-500/30 text-blue-400 px-2 py-1 rounded-full text-xs font-bold flex items-center">
                                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                  Processing
                                </div>
                              )}
                            </div>
                            <img 
                              src={resultUrl} 
                              alt={`Generated ${index + 1}`} 
                              className="w-full rounded-lg shadow-2xl shadow-black/50 border border-slate-800"
                            />
                          </div>
                        )
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
          </div>
        ) : selectedSection === 'preset-picture' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Panel: Preset Picture Controls */}
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
                </div>
              </div>

              {/* Preset Picture Generation Controls */}
              <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl shadow-xl">
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center">
                  <Palette className="w-4 h-4 mr-2" /> Preset Picture
                </h2>
                
                <div className="space-y-4">
                  {/* Preset Selector */}
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Select Preset</label>
                    <select
                      value={selectedPresetTitle}
                      onChange={(e) => handlePresetSelect(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                    >
                      <option value="">-- Select a preset --</option>
                      {presetPrompts.map((preset, index) => (
                        <option key={index} value={preset.title}>
                          {preset.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Model Selector */}
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Select Model</label>
                    <div className="grid grid-cols-1 gap-2">
                      {AVAILABLE_MODELS.filter(m => 
                        m.id === 'google/nano-banana-pro/edit' || m.id === 'bytedance/seedream-v4.5/edit'
                      ).map((model) => (
                        <button
                          key={model.id}
                          onClick={() => setPresetSelectedModel(model.id)}
                          className={`flex items-center p-3 rounded-lg border transition-all text-left ${
                            presetSelectedModel === model.id
                              ? 'bg-indigo-600/10 border-indigo-500/50 ring-1 ring-indigo-500/50'
                              : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="p-2 rounded-md mr-3 bg-blue-500/10 text-blue-400">
                            <ImageIcon size={16} />
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
                      {presetSelectedModel.includes('nano-banana-pro/edit') ? 'Aspect Ratio' : 'Dimensions'}
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
                            {!presetSelectedModel.includes('nano-banana-pro/edit') && (
                              <span className="text-[10px] text-slate-500 opacity-80">{dim.width} × {dim.height}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Resolution Selector - For nano-banana-pro */}
                  {presetSelectedModel.includes('nano-banana-pro') && (
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
                      <span className="text-indigo-400 ml-1">(Required for Edit)</span>
                    </label>
                    
                    {/* Grid of uploaded images */}
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      {presetReferenceImages.map((img, idx) => (
                        <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-700 bg-black/20">
                          <img src={img} alt={`Reference ${idx + 1}`} className="w-full h-full object-cover" />
                          <button 
                            onClick={() => removePresetImage(idx)}
                            className="absolute top-1 right-1 bg-black/60 hover:bg-red-500/80 text-white p-0.5 rounded-full backdrop-blur-sm transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      
                      {/* Add Button */}
                      <div 
                        onClick={() => presetFileInputRef.current?.click()}
                        className="cursor-pointer border-2 border-dashed border-slate-800 rounded-lg aspect-square flex flex-col items-center justify-center hover:bg-slate-800/50 hover:border-indigo-500/50 transition-all group"
                      >
                        <Plus className="w-5 h-5 text-slate-600 group-hover:text-indigo-400" />
                        <span className="text-[10px] text-slate-600 group-hover:text-indigo-400 mt-1">Add</span>
                      </div>
                    </div>

                    <input 
                      type="file" 
                      ref={presetFileInputRef}
                      onChange={handlePresetImageUpload}
                      accept="image/*"
                      multiple
                      className="hidden" 
                    />
                    
                    <div className="text-[10px] text-slate-500 flex justify-between">
                      <span>{presetReferenceImages.length} image(s) loaded</span>
                      {presetReferenceImages.length > 0 && (
                        <button onClick={() => setPresetReferenceImages([])} className="text-red-400/70 hover:text-red-400">Clear all</button>
                      )}
                    </div>
                  </div>

                  {/* Prompt Input */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs text-slate-500">Prompt</label>
                      <button
                        onClick={resetPresetPromptToDefault}
                        disabled={!selectedPresetTitle}
                        className="text-xs text-slate-400 hover:text-indigo-400 flex items-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Reset to default prompt"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Reset
                      </button>
                    </div>
                    <textarea
                      value={presetPrompt}
                      onChange={(e) => setPresetPrompt(e.target.value)}
                      placeholder="Select a preset or enter your prompt..."
                      className="w-full h-32 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all resize-none"
                    />
                  </div>

                  <button
                    onClick={generatePresetPicture}
                    disabled={presetLoading || !apiKey}
                    className={`w-full py-3 px-4 rounded-xl flex items-center justify-center font-medium transition-all ${
                      presetLoading
                        ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-lg shadow-indigo-500/20 active:scale-95'
                    }`}
                  >
                    {presetLoading ? (
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
                  {presetStatus && (
                     <div className={`px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md flex items-center ${
                       presetStatus === 'succeeded' || presetStatus === 'completed' || presetStatus === 'SUCCESS' ? 'bg-green-500/20 border-green-500/30 text-green-400' :
                       presetStatus === 'failed' || presetStatus === 'FAILURE' ? 'bg-red-500/20 border-red-500/30 text-red-400' :
                       'bg-blue-500/20 border-blue-500/30 text-blue-400'
                     }`}>
                       {presetStatus === 'succeeded' || presetStatus === 'completed' || presetStatus === 'SUCCESS' ? <CheckCircle2 className="w-3 h-3 mr-1" /> : 
                        presetStatus === 'failed' || presetStatus === 'FAILURE' ? <AlertCircle className="w-3 h-3 mr-1" /> : 
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                       {presetStatus.toUpperCase()}
                     </div>
                  )}
                </div>

                {/* Main Canvas Area */}
                <div className="flex-1 flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800/30 via-slate-900 to-slate-950">
                  
                  {presetError && (
                    <div className="text-center max-w-md p-6 bg-red-500/10 border border-red-500/20 rounded-xl">
                      <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                      <h3 className="text-red-400 font-medium mb-1">Generation Failed</h3>
                      <p className="text-red-400/70 text-sm">{presetError}</p>
                    </div>
                  )}

                  {!presetResultUrl && !presetLoading && !presetError && (
                    <div className="text-center opacity-30">
                     <div className="w-24 h-24 border-2 border-dashed border-slate-500 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                       <Palette className="w-8 h-8 text-slate-500" />
                     </div>
                     <p className="text-slate-400">Select a preset and prompt to begin</p>
                    </div>
                  )}

                {presetLoading && (
                   <div className="text-center">
                     <div className="relative w-20 h-20 mx-auto mb-6">
                       <div className="absolute inset-0 border-4 border-indigo-500/30 rounded-full"></div>
                       <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                     </div>
                     <p className="text-indigo-400 animate-pulse font-medium">Generating your masterpiece...</p>
                     <p className="text-slate-500 text-xs mt-2">This may take a few moments</p>
                   </div>
                )}

                {presetResultUrl && !presetLoading && (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <img 
                      src={presetResultUrl} 
                      alt="Generated content" 
                      className="max-w-full max-h-[70vh] rounded-lg shadow-2xl shadow-black/50 border border-slate-800"
                    />
                  </div>
                )}
              </div>
            </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-slate-400">Section "{selectedSection}" coming soon...</p>
          </div>
        )}
      </main>
    </div>
  );
}