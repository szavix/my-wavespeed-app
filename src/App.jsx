import React, { useState, useEffect, useRef } from 'react';
import { Play, Image as ImageIcon, Video, Loader2, Send, Settings, AlertCircle, CheckCircle2, Upload, X, ImagePlus, Layout, Smartphone, Frame, Plus, Instagram, Palette, Film, RotateCcw, Menu, ChevronLeft, ChevronRight, FileText, Shirt, Download, CalendarDays } from 'lucide-react';

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

// --- Password Gate ---
function PasswordGate({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('app_authenticated') === 'true';
  });
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Small delay to feel intentional
    setTimeout(() => {
      if (password === import.meta.env.VITE_APP_PASSWORD) {
        sessionStorage.setItem('app_authenticated', 'true');
        setIsAuthenticated(true);
      } else {
        setError('Incorrect password');
        setPassword('');
      }
      setLoading(false);
    }, 300);
  };

  if (isAuthenticated) {
    return children;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl shadow-black/50">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-violet-600 rounded-xl mx-auto mb-4 flex items-center justify-center">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">Access Required</h1>
            <p className="text-slate-400 text-sm mt-1">Enter the password to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
            {/* Hidden username field so browsers recognize this as a login form */}
            <input
              type="text"
              name="username"
              autoComplete="username"
              value="admin"
              readOnly
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
            />
            <div>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoFocus
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={!password || loading}
              className="w-full py-3 bg-gradient-to-r from-pink-500 to-violet-600 hover:from-pink-600 hover:to-violet-700 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 text-white font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Enter'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  // Section selection state
  const [selectedSection, setSelectedSection] = useState('custom');
  const [sidepanelOpen, setSidepanelOpen] = useState(false); // Hidden by default on mobile, visible on desktop

  // Auto-open sidepanel on desktop, keep closed on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidepanelOpen(true);
      } else {
        setSidepanelOpen(false);
      }
    };

    // Set initial state
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // State
  const [apiKey, setApiKey] = useState('');
  const [openAiKey, setOpenAiKey] = useState('');
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
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleImageUrl, setScheduleImageUrl] = useState('');
  const [scheduleTitle, setScheduleTitle] = useState('Generated Content');
  const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().split('T')[0]);
  const [schedulePlatform, setSchedulePlatform] = useState('');
  const [calendarPlatformOptions, setCalendarPlatformOptions] = useState([]);
  const [scheduledItemsOnDate, setScheduledItemsOnDate] = useState([]);
  const [scheduledItemsLoading, setScheduledItemsLoading] = useState(false);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleError, setScheduleError] = useState(null);
  const [scheduleSuccess, setScheduleSuccess] = useState(null);
  const [scheduleCalendarOpen, setScheduleCalendarOpen] = useState(false);
  const [scheduleCalendarMonth, setScheduleCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // IG Picture specific state
  const [igFirstImage, setIgFirstImage] = useState(null);
  const [igSecondImages, setIgSecondImages] = useState([]);
  const [igSelectedModel, setIgSelectedModel] = useState('google/nano-banana-pro/edit');
  const [igAppendText, setIgAppendText] = useState({ blackNails: false, blackPhoneCase: false }); // Track both options independently
  const [igPrompt, setIgPrompt] = useState('refer to face and hair from the first image, and the pose, outfit and background from the second image.'); // Editable prompt
  const [igResults, setIgResults] = useState([]); // Array of result URLs from multiple jobs
  const [igLoading, setIgLoading] = useState(false);
  const [igJobStatuses, setIgJobStatuses] = useState([]); // Array of status objects for each job

  // Preset Picture specific state (loaded from Notion)
  const [presetPrompts, setPresetPrompts] = useState([]);
  const [presetPromptsLoading, setPresetPromptsLoading] = useState(false);
  const [presetPromptsError, setPresetPromptsError] = useState(null);
  const [selectedPresetTitle, setSelectedPresetTitle] = useState('');
  const [presetPrompt, setPresetPrompt] = useState(''); // Editable prompt
  const [presetSelectedModel, setPresetSelectedModel] = useState('google/nano-banana-pro/edit');
  const [presetReferenceImages, setPresetReferenceImages] = useState([]);
  const [presetLoading, setPresetLoading] = useState(false);
  const [presetStatus, setPresetStatus] = useState(null);
  const [presetResultUrl, setPresetResultUrl] = useState(null);
  const [presetError, setPresetError] = useState(null);

  // Notion Outfits state
  const [notionOutfits, setNotionOutfits] = useState([]);
  const [outfitsLoading, setOutfitsLoading] = useState(false);
  const [outfitsError, setOutfitsError] = useState(null);
  const [outfitTypeFilterBySection, setOutfitTypeFilterBySection] = useState({
    custom: 'all',
    'ig-picture': 'all',
    'preset-picture': 'all',
    img2txt2img: 'all'
  });
  const [notionReferenceImages, setNotionReferenceImages] = useState([]);
  const [referenceImagesLoading, setReferenceImagesLoading] = useState(false);
  const [referenceImagesError, setReferenceImagesError] = useState(null);
  const [outfitImagesLoadingSection, setOutfitImagesLoadingSection] = useState(null);
  const [referenceImagesLoadingSection, setReferenceImagesLoadingSection] = useState(null);
  const [selectedCustomOutfitIds, setSelectedCustomOutfitIds] = useState([]);
  const [selectedIgOutfitIds, setSelectedIgOutfitIds] = useState([]);
  const [selectedPresetOutfitIds, setSelectedPresetOutfitIds] = useState([]);
  const [selectedImg2txt2imgOutfitIds, setSelectedImg2txt2imgOutfitIds] = useState([]);
  const [selectedCustomReferenceDbIds, setSelectedCustomReferenceDbIds] = useState([]);
  const [selectedIgReferenceDbIds, setSelectedIgReferenceDbIds] = useState([]);
  const [selectedPresetReferenceDbIds, setSelectedPresetReferenceDbIds] = useState([]);
  const [selectedImg2txt2imgReferenceDbIds, setSelectedImg2txt2imgReferenceDbIds] = useState([]);
  const [customOutfitImageMap, setCustomOutfitImageMap] = useState({});
  const [igOutfitImageMap, setIgOutfitImageMap] = useState({});
  const [presetOutfitImageMap, setPresetOutfitImageMap] = useState({});
  const [img2txt2imgOutfitImageMap, setImg2txt2imgOutfitImageMap] = useState({});
  const [customReferenceDbImageMap, setCustomReferenceDbImageMap] = useState({});
  const [igReferenceDbImageMap, setIgReferenceDbImageMap] = useState({});
  const [presetReferenceDbImageMap, setPresetReferenceDbImageMap] = useState({});
  const [img2txt2imgReferenceDbImageMap, setImg2txt2imgReferenceDbImageMap] = useState({});

  const flattenImageMap = (imageMap) => Object.values(imageMap).flat();
  const customOutfitImages = flattenImageMap(customOutfitImageMap);
  const igOutfitImages = flattenImageMap(igOutfitImageMap);
  const presetOutfitImages = flattenImageMap(presetOutfitImageMap);
  const img2txt2imgOutfitImages = flattenImageMap(img2txt2imgOutfitImageMap);
  const customReferenceDbImages = flattenImageMap(customReferenceDbImageMap);
  const igReferenceDbImages = flattenImageMap(igReferenceDbImageMap);
  const presetReferenceDbImages = flattenImageMap(presetReferenceDbImageMap);
  const img2txt2imgReferenceDbImages = flattenImageMap(img2txt2imgReferenceDbImageMap);

  // Img2Txt2Img specific state
  const [img2txt2imgCaptionImage, setImg2txt2imgCaptionImage] = useState(null);
  const [img2txt2imgCaption, setImg2txt2imgCaption] = useState('');
  const [img2txt2imgCaptionLoading, setImg2txt2imgCaptionLoading] = useState(false);
  const [img2txt2imgCaptionStatus, setImg2txt2imgCaptionStatus] = useState(null);
  const [img2txt2imgCaptionDetailLevel, setImg2txt2imgCaptionDetailLevel] = useState('high');
  const [img2txt2imgSelectedModel, setImg2txt2imgSelectedModel] = useState('google/nano-banana-pro/edit');
  const [img2txt2imgReferenceImages, setImg2txt2imgReferenceImages] = useState([]);
  const [img2txt2imgLoading, setImg2txt2imgLoading] = useState(false);
  const [img2txt2imgStatus, setImg2txt2imgStatus] = useState(null);
  const [img2txt2imgResultUrl, setImg2txt2imgResultUrl] = useState(null);
  const [img2txt2imgError, setImg2txt2imgError] = useState(null);

  // Video section specific state (Kling 2.6 Motion Control)
  const [videoImage, setVideoImage] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [videoCharacterOrientation, setVideoCharacterOrientation] = useState('video');
  const [videoKeepOriginalSound, setVideoKeepOriginalSound] = useState(true);
  const [videoPrompt, setVideoPrompt] = useState('');
  const [videoNegativePrompt, setVideoNegativePrompt] = useState('');
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoStatus, setVideoStatus] = useState(null);
  const [videoResultUrl, setVideoResultUrl] = useState(null);
  const [videoError, setVideoError] = useState(null);

  const fileInputRef = useRef(null);
  const igFirstImageRef = useRef(null);
  const igSecondImagesRef = useRef(null);
  const presetFileInputRef = useRef(null);
  const img2txt2imgCaptionImageRef = useRef(null);
  const img2txt2imgReferenceImagesRef = useRef(null);
  const videoImageRef = useRef(null);
  const videoFileRef = useRef(null);
  const scheduleFetchSeqRef = useRef(0);
  const scheduleCacheRef = useRef({});

  // Persistence & Environment Variables
  useEffect(() => {
    // 1. Try to load from LocalStorage first (user override)
    const storedWavespeedKey = localStorage.getItem('wavespeed_api_key');
    const storedOpenAiKey = localStorage.getItem('openai_api_key');

    // 2. If not in Storage, check Environment Variables
    const envWavespeedKey = getEnv('WAVESPEED_API_KEY');
    const envOpenAiKey = getEnv('OPENAI_API_KEY');

    if (storedWavespeedKey) {
      setApiKey(storedWavespeedKey);
    } else if (envWavespeedKey) {
      setApiKey(envWavespeedKey);
    }

    if (storedOpenAiKey) {
      setOpenAiKey(storedOpenAiKey);
    } else if (envOpenAiKey) {
      setOpenAiKey(envOpenAiKey);
    }
  }, []);

  const handleSaveKey = (key) => {
    setApiKey(key);
    localStorage.setItem('wavespeed_api_key', key);
  };

  const handleSaveOpenAiKey = (key) => {
    setOpenAiKey(key);
    localStorage.setItem('openai_api_key', key);
  };

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev]);
  };

  const formatDateForInput = (dateObj) => {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const parseInputDate = (value) => {
    if (!value) return null;
    const [y, m, d] = value.split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  };

  const downloadGeneratedAsset = async (url, filePrefix = 'generated') => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Download failed: HTTP ${response.status}`);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const ext = blob.type?.includes('png') ? 'png' : blob.type?.includes('jpeg') ? 'jpg' : 'png';
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = `${filePrefix}-${Date.now()}.${ext}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to download image.');
    }
  };

  const fetchScheduledItemsForDate = async (date, options = {}) => {
    const { force = false } = options;
    if (!date) return;
    const cached = scheduleCacheRef.current[date];
    if (!force && cached) {
      setScheduledItemsOnDate(cached.items || []);
      setCalendarPlatformOptions(cached.platformOptions || []);
      if (!schedulePlatform && (cached.platformOptions || []).length > 0) {
        setSchedulePlatform(cached.platformOptions[0]);
      }
      return;
    }

    const requestId = ++scheduleFetchSeqRef.current;
    setScheduledItemsLoading(true);
    setScheduleError(null);
    try {
      const response = await fetch(`/api/content-calendar?date=${encodeURIComponent(date)}`);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${response.status}`);
      }
      const data = await response.json();
      if (requestId !== scheduleFetchSeqRef.current) return;
      scheduleCacheRef.current[date] = {
        items: data.items || [],
        platformOptions: data.platformOptions || [],
      };
      setScheduledItemsOnDate(data.items || []);
      setCalendarPlatformOptions(data.platformOptions || []);
      if (!schedulePlatform && (data.platformOptions || []).length > 0) {
        setSchedulePlatform(data.platformOptions[0]);
      }
    } catch (err) {
      if (requestId !== scheduleFetchSeqRef.current) return;
      console.error(err);
      setScheduleError(err.message || 'Failed to load scheduled content.');
    } finally {
      if (requestId === scheduleFetchSeqRef.current) {
        setScheduledItemsLoading(false);
      }
    }
  };

  const openScheduleModal = (imageUrl, defaultTitle = 'Generated Content') => {
    const todayDate = new Date();
    const today = formatDateForInput(todayDate);
    setScheduleImageUrl(imageUrl);
    setScheduleTitle(defaultTitle);
    setScheduleDate(today);
    setScheduleCalendarMonth(new Date(todayDate.getFullYear(), todayDate.getMonth(), 1));
    setScheduleCalendarOpen(false);
    setSchedulePlatform('');
    setScheduleSuccess(null);
    setScheduleError(null);
    setScheduleModalOpen(true);
  };

  const closeScheduleModal = () => {
    scheduleFetchSeqRef.current += 1;
    setScheduleCalendarOpen(false);
    setScheduleModalOpen(false);
  };

  const scheduleGeneratedContent = async () => {
    if (!scheduleImageUrl || !scheduleDate || !schedulePlatform) {
      setScheduleError('Please select a date and platform.');
      return;
    }

    setScheduleSaving(true);
    setScheduleError(null);
    setScheduleSuccess(null);
    try {
      const response = await fetch('/api/content-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: scheduleTitle || 'Generated Content',
          publishDate: scheduleDate,
          platform: schedulePlatform,
          imageUrl: scheduleImageUrl,
        }),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${response.status}`);
      }

      setScheduleSuccess('Scheduled successfully.');
      await fetchScheduledItemsForDate(scheduleDate, { force: true });
    } catch (err) {
      console.error(err);
      setScheduleError(err.message || 'Failed to schedule content.');
    } finally {
      setScheduleSaving(false);
    }
  };

  const renderImageActions = (url, title = 'Generated Content') => (
    <div className="mt-3 flex items-center gap-2">
      <button
        onClick={() => downloadGeneratedAsset(url)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs transition-colors"
      >
        <Download className="w-3.5 h-3.5" />
        Download
      </button>
      <button
        onClick={() => openScheduleModal(url, title)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-500/40 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-300 text-xs transition-colors"
      >
        <CalendarDays className="w-3.5 h-3.5" />
        Schedule
      </button>
    </div>
  );

  // --- Notion Outfits ---
  const fetchNotionOutfits = async () => {
    setOutfitsLoading(true);
    setOutfitsError(null);
    try {
      const response = await fetch('/api/outfits');
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${response.status}`);
      }
      const data = await response.json();
      setNotionOutfits(data.outfits || []);
    } catch (err) {
      console.error('Failed to fetch outfits:', err);
      setOutfitsError(err.message);
    } finally {
      setOutfitsLoading(false);
    }
  };

  const fetchNotionReferenceImages = async () => {
    setReferenceImagesLoading(true);
    setReferenceImagesError(null);
    try {
      const response = await fetch('/api/reference-images');
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${response.status}`);
      }
      const data = await response.json();
      setNotionReferenceImages(data.referenceImages || []);
    } catch (err) {
      console.error('Failed to fetch reference images:', err);
      setReferenceImagesError(err.message);
    } finally {
      setReferenceImagesLoading(false);
    }
  };

  const fetchPresetPrompts = async () => {
    setPresetPromptsLoading(true);
    setPresetPromptsError(null);
    try {
      const response = await fetch('/api/prompts');
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${response.status}`);
      }
      const data = await response.json();
      setPresetPrompts(data.prompts || []);
    } catch (err) {
      console.error('Failed to fetch preset prompts:', err);
      setPresetPromptsError(err.message);
      setPresetPrompts([]);
    } finally {
      setPresetPromptsLoading(false);
    }
  };

  // Fetch outfits on mount
  useEffect(() => {
    fetchNotionOutfits();
    fetchNotionReferenceImages();
    fetchPresetPrompts();
  }, []);

  useEffect(() => {
    if (!selectedPresetTitle) return;
    const exists = presetPrompts.some((p) => p.title === selectedPresetTitle);
    if (!exists) {
      setSelectedPresetTitle('');
      setPresetPrompt('');
    }
  }, [presetPrompts, selectedPresetTitle]);

  useEffect(() => {
    if (scheduleModalOpen && scheduleDate) {
      const timer = setTimeout(() => {
        fetchScheduledItemsForDate(scheduleDate);
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [scheduleModalOpen, scheduleDate]);

  useEffect(() => {
    const selected = parseInputDate(scheduleDate);
    if (selected) {
      setScheduleCalendarMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
    }
  }, [scheduleDate]);

  const loadOutfitImages = async (outfit) => {
    const base64Images = [];
    for (const imageUrl of outfit.images || []) {
      const proxyResponse = await fetch(`/api/notion-image?url=${encodeURIComponent(imageUrl)}`);
      if (!proxyResponse.ok) {
        const errData = await proxyResponse.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to fetch outfit image');
      }
      const data = await proxyResponse.json();
      base64Images.push(data.dataUrl);
    }
    return base64Images;
  };

  const outfitSectionConfig = {
    custom: {
      getSelectedIds: () => selectedCustomOutfitIds,
      setSelectedIds: setSelectedCustomOutfitIds,
      setImageMap: setCustomOutfitImageMap
    },
    'ig-picture': {
      getSelectedIds: () => selectedIgOutfitIds,
      setSelectedIds: setSelectedIgOutfitIds,
      setImageMap: setIgOutfitImageMap
    },
    'preset-picture': {
      getSelectedIds: () => selectedPresetOutfitIds,
      setSelectedIds: setSelectedPresetOutfitIds,
      setImageMap: setPresetOutfitImageMap
    },
    img2txt2img: {
      getSelectedIds: () => selectedImg2txt2imgOutfitIds,
      setSelectedIds: setSelectedImg2txt2imgOutfitIds,
      setImageMap: setImg2txt2imgOutfitImageMap
    }
  };

  const referenceSectionConfig = {
    custom: {
      getSelectedIds: () => selectedCustomReferenceDbIds,
      setSelectedIds: setSelectedCustomReferenceDbIds,
      setImageMap: setCustomReferenceDbImageMap
    },
    'ig-picture': {
      getSelectedIds: () => selectedIgReferenceDbIds,
      setSelectedIds: setSelectedIgReferenceDbIds,
      setImageMap: setIgReferenceDbImageMap
    },
    'preset-picture': {
      getSelectedIds: () => selectedPresetReferenceDbIds,
      setSelectedIds: setSelectedPresetReferenceDbIds,
      setImageMap: setPresetReferenceDbImageMap
    },
    img2txt2img: {
      getSelectedIds: () => selectedImg2txt2imgReferenceDbIds,
      setSelectedIds: setSelectedImg2txt2imgReferenceDbIds,
      setImageMap: setImg2txt2imgReferenceDbImageMap
    }
  };

  const handleOutfitSelectForSection = async (sectionKey, outfit) => {
    const section = outfitSectionConfig[sectionKey];
    if (!section) return;

    if (section.getSelectedIds().includes(outfit.id)) {
      section.setSelectedIds((prev) => prev.filter((id) => id !== outfit.id));
      section.setImageMap((prev) => {
        const next = { ...prev };
        delete next[outfit.id];
        return next;
      });
      addLog(`Removed outfit from ${sectionKey}.`);
      return;
    }

    if (!outfit.images || outfit.images.length === 0) {
      addLog(`Outfit "${outfit.name}" has no images.`);
      return;
    }

    setOutfitImagesLoadingSection(sectionKey);
    addLog(`Loading outfit for ${sectionKey}: ${outfit.name}...`);

    try {
      const base64Images = await loadOutfitImages(outfit);
      section.setSelectedIds((prev) => [...prev, outfit.id]);
      section.setImageMap((prev) => ({ ...prev, [outfit.id]: base64Images }));
      addLog(`Loaded ${base64Images.length} outfit image(s) for ${sectionKey}.`);
    } catch (err) {
      console.error('Failed to load outfit images:', err);
      addLog(`Error loading outfit images: ${err.message}`);
    } finally {
      setOutfitImagesLoadingSection(null);
    }
  };

  const handleReferenceSelectForSection = async (sectionKey, referenceItem) => {
    const section = referenceSectionConfig[sectionKey];
    if (!section) return;

    if (section.getSelectedIds().includes(referenceItem.id)) {
      section.setSelectedIds((prev) => prev.filter((id) => id !== referenceItem.id));
      section.setImageMap((prev) => {
        const next = { ...prev };
        delete next[referenceItem.id];
        return next;
      });
      addLog(`Removed reference image from ${sectionKey}.`);
      return;
    }

    if (!referenceItem.images || referenceItem.images.length === 0) {
      addLog(`Reference image "${referenceItem.name}" has no images.`);
      return;
    }

    setReferenceImagesLoadingSection(sectionKey);
    addLog(`Loading reference image for ${sectionKey}: ${referenceItem.name}...`);

    try {
      const base64Images = await loadOutfitImages(referenceItem);
      section.setSelectedIds((prev) => [...prev, referenceItem.id]);
      section.setImageMap((prev) => ({ ...prev, [referenceItem.id]: base64Images }));
      addLog(`Loaded ${base64Images.length} reference image(s) for ${sectionKey}.`);
    } catch (err) {
      console.error('Failed to load reference images:', err);
      addLog(`Error loading reference images: ${err.message}`);
    } finally {
      setReferenceImagesLoadingSection(null);
    }
  };

  const renderReferenceSelector = (sectionKey, selectedReferenceIds) => {
    const isReferenceLoading = referenceImagesLoadingSection === sectionKey;

    return (
      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="block text-xs text-slate-500 flex items-center gap-1">
            <ImagePlus className="w-3 h-3" /> Reference Image
            <span className="text-indigo-400 ml-1">(from Notion)</span>
          </label>
          <button
            onClick={fetchNotionReferenceImages}
            disabled={referenceImagesLoading}
            className="text-xs text-slate-400 hover:text-indigo-400 flex items-center gap-1 transition-colors disabled:opacity-50"
            title="Refresh reference images"
          >
            <RotateCcw className={`w-3 h-3 ${referenceImagesLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {referenceImagesError && (
          <div className="text-xs text-red-400/80 bg-red-500/10 border border-red-500/20 rounded-lg p-2 mb-2">
            {referenceImagesError}
          </div>
        )}

        {referenceImagesLoading && notionReferenceImages.length === 0 ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-400 mr-2" />
            <span className="text-xs text-slate-500">Loading reference images...</span>
          </div>
        ) : notionReferenceImages.length === 0 ? (
          <div className="text-xs text-slate-600 text-center py-3 border border-dashed border-slate-800 rounded-lg">
            No reference images found. Check your Notion integration.
          </div>
        ) : (
          <div className="max-h-40 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
            {notionReferenceImages.map((item) => (
              <button
                key={`${sectionKey}-${item.id}`}
                onClick={() => handleReferenceSelectForSection(sectionKey, item)}
                disabled={isReferenceLoading}
                className={`w-full flex items-center gap-2 p-2 rounded-lg border transition-all text-left text-sm ${selectedReferenceIds.includes(item.id)
                  ? 'bg-indigo-600/15 border-indigo-500/50 ring-1 ring-indigo-500/40'
                  : 'bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
                  } ${isReferenceLoading ? 'opacity-60 cursor-wait' : ''}`}
              >
                {item.images && item.images.length > 0 ? (
                  <img
                    src={item.images[0]}
                    alt={item.name}
                    className="w-8 h-8 rounded object-cover flex-shrink-0 border border-slate-700"
                  />
                ) : (
                  <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center flex-shrink-0 border border-slate-700">
                    <ImagePlus className="w-4 h-4 text-slate-600" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <span className={`block truncate ${selectedReferenceIds.includes(item.id) ? 'text-indigo-300' : 'text-slate-300'}`}>
                    {item.name}
                  </span>
                  <span className="text-[10px] text-slate-600">
                    {item.images?.length || 0} image(s)
                  </span>
                </div>
                {selectedReferenceIds.includes(item.id) && (
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                )}
                {isReferenceLoading && selectedReferenceIds.includes(item.id) && (
                  <Loader2 className="w-4 h-4 text-indigo-400 animate-spin flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderOutfitSelector = (sectionKey, selectedOutfitIds) => {
    const isOutfitLoading = outfitImagesLoadingSection === sectionKey;
    const selectedTypeFilter = outfitTypeFilterBySection[sectionKey] || 'all';
    const availableTypes = Array.from(
      new Set(
        notionOutfits
          .map((outfit) => (outfit.type || '').trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));
    const filteredOutfits = selectedTypeFilter === 'all'
      ? notionOutfits
      : notionOutfits.filter((outfit) => (outfit.type || '').trim() === selectedTypeFilter);

    return (
      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="block text-xs text-slate-500 flex items-center gap-1">
            <Shirt className="w-3 h-3" /> Outfits
            <span className="text-indigo-400 ml-1">(from Notion)</span>
          </label>
          <button
            onClick={fetchNotionOutfits}
            disabled={outfitsLoading}
            className="text-xs text-slate-400 hover:text-indigo-400 flex items-center gap-1 transition-colors disabled:opacity-50"
            title="Refresh outfits"
          >
            <RotateCcw className={`w-3 h-3 ${outfitsLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="mb-2">
          <label className="block text-[10px] text-slate-500 mb-1">Filter by type</label>
          <select
            value={selectedTypeFilter}
            onChange={(e) => {
              const value = e.target.value;
              setOutfitTypeFilterBySection((prev) => ({ ...prev, [sectionKey]: value }));
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
          >
            <option value="all">All types</option>
            {availableTypes.map((type) => (
              <option key={`${sectionKey}-${type}`} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {outfitsError && (
          <div className="text-xs text-red-400/80 bg-red-500/10 border border-red-500/20 rounded-lg p-2 mb-2">
            {outfitsError}
          </div>
        )}

        {outfitsLoading && notionOutfits.length === 0 ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-400 mr-2" />
            <span className="text-xs text-slate-500">Loading outfits...</span>
          </div>
        ) : notionOutfits.length === 0 ? (
          <div className="text-xs text-slate-600 text-center py-3 border border-dashed border-slate-800 rounded-lg">
            No outfits found. Check your Notion integration.
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
            {filteredOutfits.length === 0 && (
              <div className="text-xs text-slate-600 text-center py-3 border border-dashed border-slate-800 rounded-lg">
                No outfits match this type filter.
              </div>
            )}
            {filteredOutfits.map((outfit) => (
              <button
                key={`${sectionKey}-${outfit.id}`}
                onClick={() => handleOutfitSelectForSection(sectionKey, outfit)}
                disabled={isOutfitLoading}
                className={`w-full flex items-center gap-4 p-3 rounded-lg border transition-all text-left text-sm ${selectedOutfitIds.includes(outfit.id)
                  ? 'bg-indigo-600/15 border-indigo-500/50 ring-1 ring-indigo-500/40'
                  : 'bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
                  } ${isOutfitLoading ? 'opacity-60 cursor-wait' : ''}`}
              >
                {outfit.images && outfit.images.length > 0 ? (
                  <img
                    src={outfit.images[0]}
                    alt={outfit.name}
                    className="w-20 h-20 rounded-lg object-cover flex-shrink-0 border border-slate-700"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0 border border-slate-700">
                    <Shirt className="w-8 h-8 text-slate-600" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <span className={`block truncate ${selectedOutfitIds.includes(outfit.id) ? 'text-indigo-300' : 'text-slate-300'}`}>
                    {outfit.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-600">
                      {outfit.images?.length || 0} image(s)
                    </span>
                    {outfit.type && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 capitalize">
                        {outfit.type}
                      </span>
                    )}
                  </div>
                </div>
                {selectedOutfitIds.includes(outfit.id) && (
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                )}
                {isOutfitLoading && selectedOutfitIds.includes(outfit.id) && (
                  <Loader2 className="w-4 h-4 text-indigo-400 animate-spin flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const sanitizeCaptionWithOpenAi = async (caption) => {
    if (!caption) return caption;
    if (!openAiKey) {
      addLog("OpenAI key not set; skipping prompt filter.");
      return caption;
    }

    const normalizedCaption = Array.isArray(caption) ? caption.join(" ") : String(caption);

    addLog("Filtering prompt with OpenAI...");

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt: {
          id: "pmpt_6976348303d88193a5f9c42ff0f0894e0090787934d9bbea"
        },
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: normalizedCaption }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg = errData.error?.message || errData.message || `OpenAI HTTP ${response.status}`;
      throw new Error(errMsg);
    }

    const data = await response.json();
    const content = (
      data?.output_text ||
      data?.output?.[0]?.content?.[0]?.text ||
      data?.output?.[0]?.content?.[0]?.text?.value
    )?.trim();
    if (!content) throw new Error("OpenAI returned an empty response.");

    const cleaned = content.replace(/^["'`]+|["'`]+$/g, "").trim();
    return cleaned;
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
    const combinedReferenceImages = [...referenceImages, ...customReferenceDbImages, ...customOutfitImages];
    if (!apiKey) {
      setError("Please enter your Wavespeed API Key first.");
      return;
    }
    if (selectedModel.id.includes('edit') && combinedReferenceImages.length === 0) {
      setError("The Edit model requires at least one reference image.");
      return;
    }
    if (selectedModel.id.includes('seedance') && combinedReferenceImages.length === 0) {
      setError("Seedance model requires a reference image.");
      return;
    }
    if (!prompt && combinedReferenceImages.length === 0) {
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
          images: combinedReferenceImages,
          resolution: resolution, // '1k', '2k', or '4k' (lowercase)
          aspect_ratio: selectedDimension.id, // e.g., '4:5', '9:16'
          output_format: 'png',
          enable_sync_mode: false,
          enable_base64_output: false
        };
      } else if (selectedModel.id.includes('seedance')) {
        // Seedance image-to-video model
        const mainImage = combinedReferenceImages[0];
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
          images: combinedReferenceImages,
          prompt: prompt || " ",
          enable_sync_mode: false,
          enable_base64_output: false
        };
      } else if (selectedModel.id.includes('nano-banana-pro')) {
        // Regular Nano Banana Pro generation
        const mainImage = combinedReferenceImages[0] || null;
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
        const mainImage = combinedReferenceImages[0] || null;
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
    let basePrompt = "refer to face and hair from the first image, and the pose, outfit and background from the second image.";
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
    const basePrompt = "refer to face and hair from the first image, and the pose, outfit and background from the second image.";
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
      const images = [igFirstImage, secondImage, ...igReferenceDbImages, ...igOutfitImages];

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
    const preset = presetPrompts.find((p) => p.title === title);
    if (preset) {
      setPresetPrompt(preset.prompt);
    } else if (!title) {
      setPresetPrompt('');
    }
  };

  const resetPresetPromptToDefault = () => {
    const preset = presetPrompts.find((p) => p.title === selectedPresetTitle);
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
    const combinedPresetImages = [...presetReferenceImages, ...presetReferenceDbImages, ...presetOutfitImages];
    if (!apiKey) {
      setPresetError("Please enter your Wavespeed API Key first.");
      return;
    }
    if (presetSelectedModel.includes('edit') && combinedPresetImages.length === 0) {
      setPresetError("The Edit model requires at least one reference image.");
      return;
    }
    if (!presetPrompt && combinedPresetImages.length === 0) {
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
          images: combinedPresetImages,
          resolution: resolution,
          aspect_ratio: selectedDimension.id,
          output_format: 'png',
          enable_sync_mode: false,
          enable_base64_output: false
        };
      } else if (presetSelectedModel.includes('seedream')) {
        payload = {
          size: `${selectedDimension.width}*${selectedDimension.height}`,
          images: combinedPresetImages,
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

  // --- Img2Txt2Img Handlers ---
  const handleImg2Txt2ImgCaptionImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setImg2txt2imgError(`File ${file.name} is too large.`);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImg2txt2imgCaptionImage(reader.result);
      setImg2txt2imgError(null);
    };
    reader.readAsDataURL(file);

    if (img2txt2imgCaptionImageRef.current) img2txt2imgCaptionImageRef.current.value = '';
  };

  const generateImageCaption = async () => {
    if (!apiKey) {
      setImg2txt2imgError("Please enter your Wavespeed API Key first.");
      return;
    }
    if (!img2txt2imgCaptionImage) {
      setImg2txt2imgError("Please upload an image to caption.");
      return;
    }

    setImg2txt2imgCaptionLoading(true);
    setImg2txt2imgCaptionStatus('queued');
    setImg2txt2imgError(null);
    setImg2txt2imgCaption('');
    setLogs([]);
    addLog("Starting image captioning...");

    try {
      const payload = {
        detail_level: img2txt2imgCaptionDetailLevel,
        enable_sync_mode: false,
        image: img2txt2imgCaptionImage
      };

      addLog("Sending caption request...");

      const submitResponse = await fetch('https://api.wavespeed.ai/api/v3/wavespeed-ai/molmo2/image-captioner', {
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
      console.log('Caption API Response:', taskData);

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

      // Check for immediate result
      if (taskData.caption || taskData.text || taskData.output) {
        const caption = taskData.caption || taskData.text || taskData.output;
        let filteredCaption = caption;
        try {
          filteredCaption = await sanitizeCaptionWithOpenAi(caption);
          addLog("Caption filtered successfully.");
        } catch (filterError) {
          console.error(filterError);
          addLog(`Caption filter failed: ${filterError.message}`);
          filteredCaption = caption;
        }
        setImg2txt2imgCaption(filteredCaption);
        setImg2txt2imgCaptionStatus('completed');
        setImg2txt2imgCaptionLoading(false);
        addLog("Caption generated successfully!");
        return;
      }

      if (!pollTarget) {
        throw new Error("Could not determine polling URL or find immediate output.");
      }

      await pollCaptionStatus(pollTarget);

    } catch (err) {
      console.error(err);
      setImg2txt2imgError(err.message);
      setImg2txt2imgCaptionLoading(false);
      setImg2txt2imgCaptionStatus('failed');
      addLog(`Error: ${err.message}`);
    }
  };

  const pollCaptionStatus = async (pollUrl) => {
    const startTime = Date.now();
    const MAX_DURATION = 80 * 1000;
    let consecutiveErrors = 0;

    await new Promise(r => setTimeout(r, 2000));

    const check = async () => {
      if (Date.now() - startTime > MAX_DURATION) {
        setImg2txt2imgCaptionLoading(false);
        setImg2txt2imgError("Operation timed out. Task may still be processing on the server.");
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
        setImg2txt2imgCaptionStatus(currentStatus);

        if (['succeeded', 'completed', 'SUCCESS'].includes(currentStatus)) {
          const caption = data.caption || data.text || data.outputs || (data.data && (data.data.caption || data.data.text || data.data.outputs));
          if (caption) {
            let filteredCaption = caption;
            try {
              filteredCaption = await sanitizeCaptionWithOpenAi(caption);
              addLog("Caption filtered successfully.");
            } catch (filterError) {
              console.error(filterError);
              addLog(`Caption filter failed: ${filterError.message}`);
              filteredCaption = caption;
            }
            setImg2txt2imgCaption(filteredCaption);
            addLog("Caption generated successfully!");
          } else {
            setImg2txt2imgError("Task complete but caption missing.");
          }
          setImg2txt2imgCaptionLoading(false);
          return;
        } else if (['failed', 'canceled', 'FAILURE'].includes(currentStatus)) {
          setImg2txt2imgCaptionLoading(false);
          setImg2txt2imgError(data.error || "Task failed.");
          addLog("Caption task failed.");
          return;
        } else {
          setTimeout(check, 3000);
        }

      } catch (err) {
        consecutiveErrors++;
        if (consecutiveErrors >= 10) {
          setImg2txt2imgCaptionLoading(false);
          setImg2txt2imgError("Connection lost or task invalid.");
        } else {
          setTimeout(check, 3000);
        }
      }
    };
    check();
  };

  const handleImg2Txt2ImgReferenceImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    files.forEach(file => {
      if (file.size > 10 * 1024 * 1024) {
        setImg2txt2imgError(`File ${file.name} is too large. Skipping.`);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setImg2txt2imgReferenceImages(prev => [...prev, reader.result]);
        setImg2txt2imgError(null);
        addLog(`Loaded: ${file.name}`);
      };
      reader.readAsDataURL(file);
    });

    if (img2txt2imgReferenceImagesRef.current) img2txt2imgReferenceImagesRef.current.value = '';
  };

  const removeImg2Txt2ImgReferenceImage = (indexToRemove) => {
    setImg2txt2imgReferenceImages(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const generateImg2Txt2Img = async () => {
    const combinedImg2txt2imgImages = [...img2txt2imgReferenceImages, ...img2txt2imgReferenceDbImages, ...img2txt2imgOutfitImages];
    if (!apiKey) {
      setImg2txt2imgError("Please enter your Wavespeed API Key first.");
      return;
    }
    if (!img2txt2imgCaption) {
      setImg2txt2imgError("Please generate a caption first.");
      return;
    }
    if (img2txt2imgSelectedModel.includes('edit') && combinedImg2txt2imgImages.length === 0) {
      setImg2txt2imgError("The Edit model requires at least one reference image.");
      return;
    }

    setImg2txt2imgLoading(true);
    setImg2txt2imgError(null);
    setImg2txt2imgResultUrl(null);
    setImg2txt2imgStatus('queued');
    setLogs([]);
    addLog(`Starting image generation with model: ${img2txt2imgSelectedModel.includes('nano-banana-pro') ? 'Nano Banana Pro Edit' : 'Seedream v4.5 Edit'}`);

    try {
      let payload = {};

      if (img2txt2imgSelectedModel.includes('nano-banana-pro/edit')) {
        payload = {
          prompt: img2txt2imgCaption || " ",
          images: combinedImg2txt2imgImages,
          resolution: resolution,
          aspect_ratio: selectedDimension.id,
          output_format: 'png',
          enable_sync_mode: false,
          enable_base64_output: false
        };
      } else if (img2txt2imgSelectedModel.includes('seedream')) {
        payload = {
          size: `${selectedDimension.width}*${selectedDimension.height}`,
          images: combinedImg2txt2imgImages,
          prompt: img2txt2imgCaption || " ",
          enable_sync_mode: false,
          enable_base64_output: false
        };
      }

      addLog("Sending payload...");

      const submitResponse = await fetch(`https://api.wavespeed.ai/api/v3/${img2txt2imgSelectedModel}`, {
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
        setImg2txt2imgStatus('completed');
        setImg2txt2imgResultUrl(immediateOutput);
        addLog("Task completed instantly.");
        setImg2txt2imgLoading(false);
        return;
      }

      if (!pollTarget) {
        throw new Error("Could not determine polling URL or find immediate output.");
      }

      pollImg2Txt2ImgStatus(pollTarget);

    } catch (err) {
      console.error(err);
      setImg2txt2imgError(err.message);
      setImg2txt2imgLoading(false);
      setImg2txt2imgStatus('failed');
      addLog(`Error: ${err.message}`);
    }
  };

  const pollImg2Txt2ImgStatus = async (pollUrl) => {
    const startTime = Date.now();
    const MAX_DURATION = 5 * 60 * 1000;
    let consecutiveErrors = 0;

    await new Promise(r => setTimeout(r, 2000));

    const check = async () => {
      if (Date.now() - startTime > MAX_DURATION) {
        setImg2txt2imgLoading(false);
        setImg2txt2imgError("Operation timed out. Task may still be processing on the server.");
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
        setImg2txt2imgStatus(currentStatus);

        if (['succeeded', 'completed', 'SUCCESS'].includes(currentStatus)) {
          const output = extractResultUrl(data);
          if (output) {
            setImg2txt2imgResultUrl(output);
            addLog("Generation successful!");
          } else {
            setImg2txt2imgError("Task complete but output missing.");
          }
          setImg2txt2imgLoading(false);
          return;
        } else if (['failed', 'canceled', 'FAILURE'].includes(currentStatus)) {
          setImg2txt2imgLoading(false);
          setImg2txt2imgError(data.error || "Task failed.");
          addLog("Task failed.");
          return;
        } else {
          setTimeout(check, 3000);
        }

      } catch (err) {
        consecutiveErrors++;
        if (consecutiveErrors >= 10) {
          setImg2txt2imgLoading(false);
          setImg2txt2imgError("Connection lost or task invalid.");
        } else {
          setTimeout(check, 3000);
        }
      }
    };
    check();
  };

  // --- Video Section Handlers (Kling 2.6 Motion Control) ---
  const handleVideoImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setVideoError(`File ${file.name} is too large.`);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setVideoImage(reader.result);
      setVideoError(null);
      addLog(`Video image loaded: ${file.name}`);
    };
    reader.readAsDataURL(file);

    if (videoImageRef.current) videoImageRef.current.value = '';
  };

  const handleVideoFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      setVideoError(`File ${file.name} is too large. Max 100MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setVideoFile(reader.result);
      setVideoError(null);
      addLog(`Video file loaded: ${file.name}`);
    };
    reader.readAsDataURL(file);

    if (videoFileRef.current) videoFileRef.current.value = '';
  };

  const generateVideo = async () => {
    if (!apiKey) {
      setVideoError("Please enter your Wavespeed API Key first.");
      return;
    }
    if (!videoImage) {
      setVideoError("Please upload a reference image.");
      return;
    }
    if (!videoFile) {
      setVideoError("Please upload a motion reference video.");
      return;
    }

    setVideoLoading(true);
    setVideoError(null);
    setVideoResultUrl(null);
    setVideoStatus('queued');
    setLogs([]);
    addLog("Starting Kling 2.6 Motion Control job...");
    addLog(`Character Orientation: ${videoCharacterOrientation}`);
    addLog(`Keep Original Sound: ${videoKeepOriginalSound}`);
    if (videoPrompt) addLog(`Prompt: ${videoPrompt}`);
    if (videoNegativePrompt) addLog(`Negative Prompt: ${videoNegativePrompt}`);

    try {
      const payload = {
        character_orientation: videoCharacterOrientation,
        image: videoImage,
        keep_original_sound: videoKeepOriginalSound,
        video: videoFile
      };

      // Add optional prompts if provided
      if (videoPrompt.trim()) {
        payload.prompt = videoPrompt.trim();
      }
      if (videoNegativePrompt.trim()) {
        payload.negative_prompt = videoNegativePrompt.trim();
      }

      addLog("Sending payload to Kling 2.6 Motion Control...");

      const submitResponse = await fetch('https://api.wavespeed.ai/api/v3/kwaivgi/kling-v2.6-std/motion-control', {
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

      const taskId = taskData.id ||
        taskData.task_id ||
        taskData.request_id ||
        taskData.job_id ||
        (taskData.data && taskData.data.id);

      if (taskId) {
        addLog(`Task submitted. ID: ${taskId}`);
        const pollUrl = `https://api.wavespeed.ai/api/v3/predictions/${taskId}/result`;
        pollVideoStatus(pollUrl);
      } else {
        throw new Error("Could not get task ID from response.");
      }

    } catch (err) {
      console.error(err);
      setVideoError(err.message);
      setVideoLoading(false);
      setVideoStatus('failed');
      addLog(`Error: ${err.message}`);
    }
  };

  const pollVideoStatus = async (pollUrl) => {
    const startTime = Date.now();
    const MAX_DURATION = 10 * 60 * 1000; // 10 minutes for video generation
    let consecutiveErrors = 0;

    await new Promise(r => setTimeout(r, 2000));

    const check = async () => {
      if (Date.now() - startTime > MAX_DURATION) {
        setVideoLoading(false);
        setVideoError("Operation timed out. Task may still be processing on the server.");
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
        setVideoStatus(currentStatus);
        addLog(`Status: ${currentStatus}`);

        if (['succeeded', 'completed', 'SUCCESS'].includes(currentStatus)) {
          const output = extractResultUrl(data);
          if (output) {
            setVideoResultUrl(output);
            addLog("Video generation successful!");
          } else {
            setVideoError("Task complete but output missing.");
          }
          setVideoLoading(false);
          return;
        } else if (['failed', 'canceled', 'FAILURE'].includes(currentStatus)) {
          setVideoLoading(false);
          setVideoError(data.error || "Task failed.");
          addLog("Task failed.");
          return;
        } else {
          setTimeout(check, 500); // Poll every 0.5 seconds as per documentation
        }

      } catch (err) {
        consecutiveErrors++;
        if (consecutiveErrors >= 10) {
          setVideoLoading(false);
          setVideoError("Connection lost or task invalid.");
        } else {
          setTimeout(check, 500);
        }
      }
    };
    check();
  };

  return (
    <PasswordGate>
      <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30 relative">
        {/* Navbar */}
        <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setSidepanelOpen(!sidepanelOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-slate-800 transition-colors"
                aria-label="Toggle sidepanel"
              >
                <Menu className="w-5 h-5 text-slate-300" />
              </button>
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

        {/* Mobile Backdrop */}
        {sidepanelOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidepanelOpen(false)}
          />
        )}

        {/* Sidepanel */}
        <div className={`fixed left-0 top-16 bottom-0 w-64 bg-slate-900/80 backdrop-blur-md border-r border-slate-800 z-40 overflow-y-auto transition-transform duration-300 ${sidepanelOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0`}>
          <div className="p-4 space-y-2">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2">Sections</div>
              <button
                onClick={() => setSidepanelOpen(false)}
                className="lg:hidden p-1 rounded-lg hover:bg-slate-800 transition-colors"
                aria-label="Close sidepanel"
              >
                <ChevronLeft className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            {[
              { id: 'ig-picture', label: 'IG Picture', icon: Instagram },
              { id: 'preset-picture', label: 'Preset Picture', icon: Palette },
              { id: 'img2txt2img', label: 'Img2Txt2Img', icon: FileText },
              { id: 'video', label: 'Video', icon: Film },
              { id: 'custom', label: 'Custom', icon: Settings }
            ].map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setSelectedSection(section.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all text-left ${selectedSection === section.id
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

        <main className="lg:ml-64 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">OpenAI API Key</label>
                      <input
                        type="password"
                        value={openAiKey}
                        onChange={(e) => handleSaveOpenAiKey(e.target.value)}
                        placeholder="sk-..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">Used to sanitize img2txt2img captions.</p>
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
                            className={`flex items-center p-3 rounded-lg border transition-all text-left ${selectedModel.id === model.id
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
                                className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${selectedDimension.id === dim.id
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
                              className={`py-2 px-3 rounded-lg border transition-all text-sm font-medium ${resolution === res
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
                                className={`py-2 px-3 rounded-lg border transition-all text-sm font-medium ${videoResolution === res
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

                      {/* Grid of attached images (manual + Notion selections) */}
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
                        {customReferenceDbImages.map((img, idx) => (
                          <div key={`custom-ref-${idx}`} className="relative aspect-square rounded-lg overflow-hidden border border-indigo-500/30 bg-black/20">
                            <img src={img} alt={`Notion reference ${idx + 1}`} className="w-full h-full object-cover" />
                            <span className="absolute bottom-1 left-1 text-[9px] px-1 py-0.5 rounded bg-indigo-950/80 text-indigo-200 border border-indigo-500/30">
                              REF
                            </span>
                          </div>
                        ))}
                        {customOutfitImages.map((img, idx) => (
                          <div key={`custom-outfit-${idx}`} className="relative aspect-square rounded-lg overflow-hidden border border-violet-500/30 bg-black/20">
                            <img src={img} alt={`Outfit reference ${idx + 1}`} className="w-full h-full object-cover" />
                            <span className="absolute bottom-1 left-1 text-[9px] px-1 py-0.5 rounded bg-violet-950/80 text-violet-200 border border-violet-500/30">
                              OUTFIT
                            </span>
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
                        <span>{referenceImages.length + customReferenceDbImages.length + customOutfitImages.length} image(s) loaded ({referenceImages.length} manual, {customReferenceDbImages.length} reference, {customOutfitImages.length} outfit)</span>
                        {(referenceImages.length > 0 || customReferenceDbImages.length > 0 || customOutfitImages.length > 0) && (
                          <button
                            onClick={() => {
                              setReferenceImages([]);
                              setSelectedCustomReferenceDbIds([]);
                              setCustomReferenceDbImageMap({});
                              setSelectedCustomOutfitIds([]);
                              setCustomOutfitImageMap({});
                            }}
                            className="text-red-400/70 hover:text-red-400"
                          >
                            Clear all
                          </button>
                        )}
                      </div>
                    </div>

                    {renderReferenceSelector('custom', selectedCustomReferenceDbIds)}
                    {renderOutfitSelector('custom', selectedCustomOutfitIds)}

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
                      className={`w-full py-3 px-4 rounded-xl flex items-center justify-center font-medium transition-all ${loading
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
                      <div className={`px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md flex items-center ${status === 'succeeded' || status === 'completed' || status === 'SUCCESS' ? 'bg-green-500/20 border-green-500/30 text-green-400' :
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
                      <div className="relative w-full h-full flex flex-col items-center justify-center">
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
                        {!resultUrl.endsWith('.mp4') && renderImageActions(resultUrl, prompt || 'Custom Generation')}
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
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">OpenAI API Key</label>
                      <input
                        type="password"
                        value={openAiKey}
                        onChange={(e) => handleSaveOpenAiKey(e.target.value)}
                        placeholder="sk-..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">Used to sanitize the caption before image generation.</p>
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
                            className={`flex items-center p-3 rounded-lg border transition-all text-left ${igSelectedModel === model.id
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
                              className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${selectedDimension.id === dim.id
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
                              className={`py-2 px-3 rounded-lg border transition-all text-sm font-medium ${resolution === res
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
                          className={`flex-1 py-2 px-3 rounded-lg border transition-all text-sm font-medium ${igAppendText.blackNails
                            ? 'bg-indigo-600/10 border-indigo-500/50 ring-1 ring-indigo-500/50 text-indigo-400'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400'
                            }`}
                        >
                          Black Nails
                        </button>
                        <button
                          onClick={toggleBlackPhoneCase}
                          className={`flex-1 py-2 px-3 rounded-lg border transition-all text-sm font-medium ${igAppendText.blackPhoneCase
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
                        <span>{igSecondImages.length} second image(s) + {igReferenceDbImages.length} reference image(s) + {igOutfitImages.length} outfit image(s)</span>
                        {(igSecondImages.length > 0 || igReferenceDbImages.length > 0 || igOutfitImages.length > 0) && (
                          <button
                            onClick={() => {
                              setIgSecondImages([]);
                              setSelectedIgReferenceDbIds([]);
                              setIgReferenceDbImageMap({});
                              setSelectedIgOutfitIds([]);
                              setIgOutfitImageMap({});
                            }}
                            className="text-red-400/70 hover:text-red-400"
                          >
                            Clear all
                          </button>
                        )}
                      </div>
                    </div>

                    {renderReferenceSelector('ig-picture', selectedIgReferenceDbIds)}
                    {renderOutfitSelector('ig-picture', selectedIgOutfitIds)}

                    <button
                      onClick={generateIgPicture}
                      disabled={igLoading || !apiKey || !igFirstImage || igSecondImages.length === 0}
                      className={`w-full py-3 px-4 rounded-xl flex items-center justify-center font-medium transition-all ${igLoading || !apiKey || !igFirstImage || igSecondImages.length === 0
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
                              {renderImageActions(resultUrl, `IG Picture ${index + 1}`)}
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
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">OpenAI API Key</label>
                      <input
                        type="password"
                        value={openAiKey}
                        onChange={(e) => handleSaveOpenAiKey(e.target.value)}
                        placeholder="sk-..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">Used to sanitize img2txt2img captions.</p>
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
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-xs text-slate-500">Select Preset</label>
                        <button
                          onClick={fetchPresetPrompts}
                          disabled={presetPromptsLoading}
                          className="text-xs text-slate-400 hover:text-indigo-400 flex items-center gap-1 transition-colors disabled:opacity-50"
                          title="Refresh prompts"
                        >
                          <RotateCcw className={`w-3 h-3 ${presetPromptsLoading ? 'animate-spin' : ''}`} />
                          Refresh
                        </button>
                      </div>
                      <select
                        value={selectedPresetTitle}
                        onChange={(e) => handlePresetSelect(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                      >
                        <option value="">
                          {presetPromptsLoading ? '-- Loading presets... --' : '-- Select a preset --'}
                        </option>
                        {presetPrompts.map((preset) => (
                          <option key={preset.id} value={preset.title}>
                            {preset.title}
                          </option>
                        ))}
                      </select>
                      {presetPromptsError && (
                        <p className="mt-1 text-[11px] text-red-400/80">{presetPromptsError}</p>
                      )}
                      {!presetPromptsLoading && !presetPromptsError && presetPrompts.length === 0 && (
                        <p className="mt-1 text-[11px] text-slate-500">No favourite prompts found in Notion.</p>
                      )}
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
                            className={`flex items-center p-3 rounded-lg border transition-all text-left ${presetSelectedModel === model.id
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
                              className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${selectedDimension.id === dim.id
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
                              className={`py-2 px-3 rounded-lg border transition-all text-sm font-medium ${resolution === res
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

                      {/* Grid of attached images (manual + Notion selections) */}
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
                        {presetReferenceDbImages.map((img, idx) => (
                          <div key={`preset-ref-${idx}`} className="relative aspect-square rounded-lg overflow-hidden border border-indigo-500/30 bg-black/20">
                            <img src={img} alt={`Notion reference ${idx + 1}`} className="w-full h-full object-cover" />
                            <span className="absolute bottom-1 left-1 text-[9px] px-1 py-0.5 rounded bg-indigo-950/80 text-indigo-200 border border-indigo-500/30">
                              REF
                            </span>
                          </div>
                        ))}
                        {presetOutfitImages.map((img, idx) => (
                          <div key={`preset-outfit-${idx}`} className="relative aspect-square rounded-lg overflow-hidden border border-violet-500/30 bg-black/20">
                            <img src={img} alt={`Outfit reference ${idx + 1}`} className="w-full h-full object-cover" />
                            <span className="absolute bottom-1 left-1 text-[9px] px-1 py-0.5 rounded bg-violet-950/80 text-violet-200 border border-violet-500/30">
                              OUTFIT
                            </span>
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
                        <span>{presetReferenceImages.length + presetReferenceDbImages.length + presetOutfitImages.length} image(s) loaded ({presetReferenceImages.length} manual, {presetReferenceDbImages.length} reference, {presetOutfitImages.length} outfit)</span>
                        {(presetReferenceImages.length > 0 || presetReferenceDbImages.length > 0 || presetOutfitImages.length > 0) && (
                          <button
                            onClick={() => {
                              setPresetReferenceImages([]);
                              setSelectedPresetReferenceDbIds([]);
                              setPresetReferenceDbImageMap({});
                              setSelectedPresetOutfitIds([]);
                              setPresetOutfitImageMap({});
                            }}
                            className="text-red-400/70 hover:text-red-400"
                          >
                            Clear all
                          </button>
                        )}
                      </div>
                    </div>

                    {renderReferenceSelector('preset-picture', selectedPresetReferenceDbIds)}
                    {renderOutfitSelector('preset-picture', selectedPresetOutfitIds)}

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
                      className={`w-full py-3 px-4 rounded-xl flex items-center justify-center font-medium transition-all ${presetLoading
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
                      <div className={`px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md flex items-center ${presetStatus === 'succeeded' || presetStatus === 'completed' || presetStatus === 'SUCCESS' ? 'bg-green-500/20 border-green-500/30 text-green-400' :
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
                      <div className="relative w-full h-full flex flex-col items-center justify-center">
                        <img
                          src={presetResultUrl}
                          alt="Generated content"
                          className="max-w-full max-h-[70vh] rounded-lg shadow-2xl shadow-black/50 border border-slate-800"
                        />
                        {renderImageActions(presetResultUrl, selectedPresetTitle || 'Preset Picture')}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          ) : selectedSection === 'img2txt2img' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

              {/* Left Panel: Img2Txt2Img Controls */}
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
                      <label className="block text-xs text-slate-500 mb-1">OpenAI API Key</label>
                      <input
                        type="password"
                        value={openAiKey}
                        onChange={(e) => handleSaveOpenAiKey(e.target.value)}
                        placeholder="sk-..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">Used to sanitize img2txt2img captions.</p>
                    </div>
                  </div>
                </div>

                {/* Image to Text Section */}
                <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl shadow-xl">
                  <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center">
                    <FileText className="w-4 h-4 mr-2" /> Image to Text
                  </h2>

                  <div className="space-y-4">
                    {/* Caption Image Upload */}
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Image to Caption</label>
                      {!img2txt2imgCaptionImage ? (
                        <div
                          onClick={() => img2txt2imgCaptionImageRef.current?.click()}
                          className="border-2 border-dashed border-slate-800 rounded-lg aspect-square flex flex-col items-center justify-center hover:bg-slate-800/50 hover:border-indigo-500/50 transition-all cursor-pointer group"
                        >
                          <Upload className="w-8 h-8 text-slate-600 group-hover:text-indigo-400 mb-2" />
                          <span className="text-xs text-slate-500 group-hover:text-indigo-400">Click to upload</span>
                        </div>
                      ) : (
                        <div className="relative aspect-square rounded-lg overflow-hidden border border-slate-700 bg-black/20 group">
                          <img src={img2txt2imgCaptionImage} alt="Caption image" className="w-full h-full object-cover" />
                          <button
                            onClick={() => setImg2txt2imgCaptionImage(null)}
                            className="absolute top-1 right-1 bg-black/60 hover:bg-red-500/80 text-white p-1 rounded-full backdrop-blur-sm transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      <input
                        type="file"
                        ref={img2txt2imgCaptionImageRef}
                        onChange={handleImg2Txt2ImgCaptionImageUpload}
                        accept="image/*"
                        className="hidden"
                      />
                    </div>

                    <button
                      onClick={generateImageCaption}
                      disabled={img2txt2imgCaptionLoading || !apiKey || !img2txt2imgCaptionImage}
                      className={`w-full py-3 px-4 rounded-xl flex items-center justify-center font-medium transition-all ${img2txt2imgCaptionLoading || !apiKey || !img2txt2imgCaptionImage
                        ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg shadow-purple-500/20 active:scale-95'
                        }`}
                    >
                      {img2txt2imgCaptionLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating Caption...
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4 mr-2" />
                          Generate Caption
                        </>
                      )}
                    </button>

                    {/* Caption Display */}
                    {img2txt2imgCaption && (
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Generated Caption</label>
                        <textarea
                          value={img2txt2imgCaption}
                          onChange={(e) => setImg2txt2imgCaption(e.target.value)}
                          placeholder="Caption will appear here..."
                          className="w-full h-32 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all resize-none"
                        />
                      </div>
                    )}

                    {/* Detail Level Toggle */}
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Caption Detail Level</label>
                      <div className="grid grid-cols-2 gap-2">
                        {['high', 'medium'].map((level) => (
                          <button
                            key={level}
                            type="button"
                            onClick={() => setImg2txt2imgCaptionDetailLevel(level)}
                            className={`py-2 px-3 rounded-lg border text-xs font-medium uppercase tracking-wide transition-all ${img2txt2imgCaptionDetailLevel === level
                              ? 'bg-indigo-600/10 border-indigo-500/50 text-indigo-300'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                              }`}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Image Generation Section */}
                <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl shadow-xl">
                  <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center">
                    <ImageIcon className="w-4 h-4 mr-2" /> Text to Image
                  </h2>

                  <div className="space-y-4">
                    {/* Model Selector */}
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Select Model</label>
                      <div className="grid grid-cols-1 gap-2">
                        {AVAILABLE_MODELS.filter(m =>
                          m.id === 'google/nano-banana-pro/edit' || m.id === 'bytedance/seedream-v4.5/edit'
                        ).map((model) => (
                          <button
                            key={model.id}
                            onClick={() => setImg2txt2imgSelectedModel(model.id)}
                            className={`flex items-center p-3 rounded-lg border transition-all text-left ${img2txt2imgSelectedModel === model.id
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
                        {img2txt2imgSelectedModel.includes('nano-banana-pro/edit') ? 'Aspect Ratio' : 'Dimensions'}
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {AVAILABLE_DIMENSIONS.map((dim) => {
                          const Icon = dim.icon;
                          return (
                            <button
                              key={dim.id}
                              onClick={() => setSelectedDimension(dim)}
                              className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${selectedDimension.id === dim.id
                                ? 'bg-indigo-600/10 border-indigo-500/50 ring-1 ring-indigo-500/50 text-indigo-400'
                                : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400'
                                }`}
                            >
                              <Icon className="w-5 h-5 mb-1" />
                              <span className="text-sm font-medium">{dim.label}</span>
                              {!img2txt2imgSelectedModel.includes('nano-banana-pro/edit') && (
                                <span className="text-[10px] text-slate-500 opacity-80">{dim.width} × {dim.height}</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Resolution Selector - For nano-banana-pro */}
                    {img2txt2imgSelectedModel.includes('nano-banana-pro') && (
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Resolution</label>
                        <div className="grid grid-cols-3 gap-2">
                          {['1k', '2k', '4k'].map((res) => (
                            <button
                              key={res}
                              onClick={() => setResolution(res)}
                              className={`py-2 px-3 rounded-lg border transition-all text-sm font-medium ${resolution === res
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

                      {/* Grid of attached images (manual + Notion selections) */}
                      <div className="grid grid-cols-3 gap-2 mb-2">
                        {img2txt2imgReferenceImages.map((img, idx) => (
                          <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-700 bg-black/20">
                            <img src={img} alt={`Reference ${idx + 1}`} className="w-full h-full object-cover" />
                            <button
                              onClick={() => removeImg2Txt2ImgReferenceImage(idx)}
                              className="absolute top-1 right-1 bg-black/60 hover:bg-red-500/80 text-white p-0.5 rounded-full backdrop-blur-sm transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        {img2txt2imgReferenceDbImages.map((img, idx) => (
                          <div key={`img2txt2img-ref-${idx}`} className="relative aspect-square rounded-lg overflow-hidden border border-indigo-500/30 bg-black/20">
                            <img src={img} alt={`Notion reference ${idx + 1}`} className="w-full h-full object-cover" />
                            <span className="absolute bottom-1 left-1 text-[9px] px-1 py-0.5 rounded bg-indigo-950/80 text-indigo-200 border border-indigo-500/30">
                              REF
                            </span>
                          </div>
                        ))}
                        {img2txt2imgOutfitImages.map((img, idx) => (
                          <div key={`img2txt2img-outfit-${idx}`} className="relative aspect-square rounded-lg overflow-hidden border border-violet-500/30 bg-black/20">
                            <img src={img} alt={`Outfit reference ${idx + 1}`} className="w-full h-full object-cover" />
                            <span className="absolute bottom-1 left-1 text-[9px] px-1 py-0.5 rounded bg-violet-950/80 text-violet-200 border border-violet-500/30">
                              OUTFIT
                            </span>
                          </div>
                        ))}

                        {/* Add Button */}
                        <div
                          onClick={() => img2txt2imgReferenceImagesRef.current?.click()}
                          className="cursor-pointer border-2 border-dashed border-slate-800 rounded-lg aspect-square flex flex-col items-center justify-center hover:bg-slate-800/50 hover:border-indigo-500/50 transition-all group"
                        >
                          <Plus className="w-5 h-5 text-slate-600 group-hover:text-indigo-400" />
                          <span className="text-[10px] text-slate-600 group-hover:text-indigo-400 mt-1">Add</span>
                        </div>
                      </div>

                      <input
                        type="file"
                        ref={img2txt2imgReferenceImagesRef}
                        onChange={handleImg2Txt2ImgReferenceImageUpload}
                        accept="image/*"
                        multiple
                        className="hidden"
                      />

                      <div className="text-[10px] text-slate-500 flex justify-between">
                        <span>{img2txt2imgReferenceImages.length + img2txt2imgReferenceDbImages.length + img2txt2imgOutfitImages.length} image(s) loaded ({img2txt2imgReferenceImages.length} manual, {img2txt2imgReferenceDbImages.length} reference, {img2txt2imgOutfitImages.length} outfit)</span>
                        {(img2txt2imgReferenceImages.length > 0 || img2txt2imgReferenceDbImages.length > 0 || img2txt2imgOutfitImages.length > 0) && (
                          <button
                            onClick={() => {
                              setImg2txt2imgReferenceImages([]);
                              setSelectedImg2txt2imgReferenceDbIds([]);
                              setImg2txt2imgReferenceDbImageMap({});
                              setSelectedImg2txt2imgOutfitIds([]);
                              setImg2txt2imgOutfitImageMap({});
                            }}
                            className="text-red-400/70 hover:text-red-400"
                          >
                            Clear all
                          </button>
                        )}
                      </div>
                    </div>

                    {renderReferenceSelector('img2txt2img', selectedImg2txt2imgReferenceDbIds)}
                    {renderOutfitSelector('img2txt2img', selectedImg2txt2imgOutfitIds)}

                    <button
                      onClick={generateImg2Txt2Img}
                      disabled={img2txt2imgLoading || !apiKey || !img2txt2imgCaption || (img2txt2imgSelectedModel.includes('edit') && (img2txt2imgReferenceImages.length + img2txt2imgReferenceDbImages.length + img2txt2imgOutfitImages.length === 0))}
                      className={`w-full py-3 px-4 rounded-xl flex items-center justify-center font-medium transition-all ${img2txt2imgLoading || !apiKey || !img2txt2imgCaption || (img2txt2imgSelectedModel.includes('edit') && (img2txt2imgReferenceImages.length + img2txt2imgReferenceDbImages.length + img2txt2imgOutfitImages.length === 0))
                        ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-lg shadow-indigo-500/20 active:scale-95'
                        }`}
                    >
                      {img2txt2imgLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Generate Image
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
                    {img2txt2imgStatus && (
                      <div className={`px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md flex items-center ${img2txt2imgStatus === 'succeeded' || img2txt2imgStatus === 'completed' || img2txt2imgStatus === 'SUCCESS' ? 'bg-green-500/20 border-green-500/30 text-green-400' :
                        img2txt2imgStatus === 'failed' || img2txt2imgStatus === 'FAILURE' ? 'bg-red-500/20 border-red-500/30 text-red-400' :
                          'bg-blue-500/20 border-blue-500/30 text-blue-400'
                        }`}>
                        {img2txt2imgStatus === 'succeeded' || img2txt2imgStatus === 'completed' || img2txt2imgStatus === 'SUCCESS' ? <CheckCircle2 className="w-3 h-3 mr-1" /> :
                          img2txt2imgStatus === 'failed' || img2txt2imgStatus === 'FAILURE' ? <AlertCircle className="w-3 h-3 mr-1" /> :
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                        {img2txt2imgStatus.toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Main Canvas Area */}
                  <div className="flex-1 flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800/30 via-slate-900 to-slate-950">

                    {img2txt2imgError && (
                      <div className="text-center max-w-md p-6 bg-red-500/10 border border-red-500/20 rounded-xl">
                        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                        <h3 className="text-red-400 font-medium mb-1">Generation Failed</h3>
                        <p className="text-red-400/70 text-sm">{img2txt2imgError}</p>
                      </div>
                    )}

                    {!img2txt2imgResultUrl && !img2txt2imgLoading && !img2txt2imgError && (
                      <div className="text-center opacity-30">
                        <div className="w-24 h-24 border-2 border-dashed border-slate-500 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                          <FileText className="w-8 h-8 text-slate-500" />
                        </div>
                        <p className="text-slate-400">Upload image, generate caption, then generate image</p>
                      </div>
                    )}

                    {img2txt2imgLoading && (
                      <div className="text-center">
                        <div className="relative w-20 h-20 mx-auto mb-6">
                          <div className="absolute inset-0 border-4 border-indigo-500/30 rounded-full"></div>
                          <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                        <p className="text-indigo-400 animate-pulse font-medium">Generating your masterpiece...</p>
                        <p className="text-slate-500 text-xs mt-2">This may take a few moments</p>
                      </div>
                    )}

                    {img2txt2imgResultUrl && !img2txt2imgLoading && (
                      <div className="relative w-full h-full flex flex-col items-center justify-center">
                        <img
                          src={img2txt2imgResultUrl}
                          alt="Generated content"
                          className="max-w-full max-h-[70vh] rounded-lg shadow-2xl shadow-black/50 border border-slate-800"
                        />
                        {renderImageActions(img2txt2imgResultUrl, 'Img2Txt2Img')}
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          ) : selectedSection === 'video' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

              {/* Left Panel: Video Controls */}
              <div className="lg:col-span-4 space-y-6">

                {/* Model Info Card */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl shadow-xl p-5">
                  <div className="flex items-center mb-4">
                    <div className="p-2 rounded-md mr-3 bg-pink-500/10 text-pink-400">
                      <Film size={20} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Kling 2.6 Motion Control</h3>
                      <p className="text-xs text-slate-500">Transfer motion from video to image</p>
                    </div>
                  </div>

                  <p className="text-slate-400 text-sm mb-4">
                    Upload a reference image and a motion video. The model will apply the motion from the video to your image.
                  </p>

                  {/* Reference Image Upload */}
                  <div className="mb-4">
                    <label className="block text-xs text-slate-500 mb-2">
                      Reference Image <span className="text-pink-400 ml-1">(Required)</span>
                    </label>

                    {videoImage ? (
                      <div className="relative group aspect-video rounded-lg overflow-hidden border border-slate-700 bg-black/20">
                        <img src={videoImage} alt="Reference" className="w-full h-full object-cover" />
                        <button
                          onClick={() => setVideoImage(null)}
                          className="absolute top-2 right-2 bg-black/60 hover:bg-red-500/80 text-white p-1 rounded-full backdrop-blur-sm transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => videoImageRef.current?.click()}
                        className="cursor-pointer border-2 border-dashed border-slate-800 rounded-lg aspect-video flex flex-col items-center justify-center hover:bg-slate-800/50 hover:border-pink-500/50 transition-all group"
                      >
                        <ImagePlus className="w-8 h-8 text-slate-600 group-hover:text-pink-400" />
                        <span className="text-xs text-slate-600 group-hover:text-pink-400 mt-2">Upload Image</span>
                      </div>
                    )}

                    <input
                      type="file"
                      ref={videoImageRef}
                      onChange={handleVideoImageUpload}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>

                  {/* Motion Video Upload */}
                  <div className="mb-4">
                    <label className="block text-xs text-slate-500 mb-2">
                      Motion Reference Video <span className="text-pink-400 ml-1">(Required)</span>
                    </label>

                    {videoFile ? (
                      <div className="relative group aspect-video rounded-lg overflow-hidden border border-slate-700 bg-black/20">
                        <video src={videoFile} className="w-full h-full object-cover" muted autoPlay loop />
                        <button
                          onClick={() => setVideoFile(null)}
                          className="absolute top-2 right-2 bg-black/60 hover:bg-red-500/80 text-white p-1 rounded-full backdrop-blur-sm transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => videoFileRef.current?.click()}
                        className="cursor-pointer border-2 border-dashed border-slate-800 rounded-lg aspect-video flex flex-col items-center justify-center hover:bg-slate-800/50 hover:border-pink-500/50 transition-all group"
                      >
                        <Video className="w-8 h-8 text-slate-600 group-hover:text-pink-400" />
                        <span className="text-xs text-slate-600 group-hover:text-pink-400 mt-2">Upload Video</span>
                      </div>
                    )}

                    <input
                      type="file"
                      ref={videoFileRef}
                      onChange={handleVideoFileUpload}
                      accept="video/*"
                      className="hidden"
                    />
                  </div>

                  {/* Character Orientation */}
                  <div className="mb-4">
                    <label className="block text-xs text-slate-500 mb-2">Character Orientation</label>
                    <select
                      value={videoCharacterOrientation}
                      onChange={(e) => setVideoCharacterOrientation(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500"
                    >
                      <option value="video">Video (Match video orientation)</option>
                      <option value="image">Image (Match image orientation)</option>
                    </select>
                  </div>

                  {/* Positive Prompt */}
                  <div className="mb-4">
                    <label className="block text-xs text-slate-500 mb-2">
                      Positive Prompt <span className="text-slate-600 ml-1">(Optional)</span>
                    </label>
                    <textarea
                      value={videoPrompt}
                      onChange={(e) => setVideoPrompt(e.target.value)}
                      placeholder="Describe what you want to see in the generated video..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-pink-500 resize-none"
                      rows={3}
                    />
                  </div>

                  {/* Negative Prompt */}
                  <div className="mb-4">
                    <label className="block text-xs text-slate-500 mb-2">
                      Negative Prompt <span className="text-slate-600 ml-1">(Optional)</span>
                    </label>
                    <textarea
                      value={videoNegativePrompt}
                      onChange={(e) => setVideoNegativePrompt(e.target.value)}
                      placeholder="Describe what you want to avoid in the generated video..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-pink-500 resize-none"
                      rows={3}
                    />
                  </div>

                  {/* Keep Original Sound */}
                  <div className="mb-6">
                    <label className="flex items-center cursor-pointer">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={videoKeepOriginalSound}
                          onChange={(e) => setVideoKeepOriginalSound(e.target.checked)}
                          className="sr-only"
                        />
                        <div className={`w-10 h-6 rounded-full transition-colors ${videoKeepOriginalSound ? 'bg-pink-500' : 'bg-slate-700'}`}>
                          <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${videoKeepOriginalSound ? 'translate-x-4' : ''}`}></div>
                        </div>
                      </div>
                      <span className="ml-3 text-sm text-slate-300">Keep Original Sound</span>
                    </label>
                  </div>

                  {/* Generate Button */}
                  <button
                    onClick={generateVideo}
                    disabled={videoLoading || !apiKey || !videoImage || !videoFile}
                    className={`w-full py-3 px-4 rounded-xl flex items-center justify-center font-medium transition-all ${videoLoading || !apiKey || !videoImage || !videoFile
                      ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white shadow-lg shadow-pink-500/20 active:scale-95'
                      }`}
                  >
                    {videoLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Generate Video
                      </>
                    )}
                  </button>
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
                      VIDEO OUTPUT
                    </div>
                    {videoStatus && (
                      <div className={`px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md flex items-center ${videoStatus === 'succeeded' || videoStatus === 'completed' || videoStatus === 'SUCCESS' ? 'bg-green-500/20 border-green-500/30 text-green-400' :
                        videoStatus === 'failed' || videoStatus === 'FAILURE' ? 'bg-red-500/20 border-red-500/30 text-red-400' :
                          'bg-pink-500/20 border-pink-500/30 text-pink-400'
                        }`}>
                        {videoStatus === 'succeeded' || videoStatus === 'completed' || videoStatus === 'SUCCESS' ? <CheckCircle2 className="w-3 h-3 mr-1" /> :
                          videoStatus === 'failed' || videoStatus === 'FAILURE' ? <AlertCircle className="w-3 h-3 mr-1" /> :
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                        {videoStatus.toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Main Canvas Area */}
                  <div className="flex-1 flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800/30 via-slate-900 to-slate-950">

                    {videoError && (
                      <div className="text-center max-w-md p-6 bg-red-500/10 border border-red-500/20 rounded-xl">
                        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                        <h3 className="text-red-400 font-medium mb-1">Generation Failed</h3>
                        <p className="text-red-400/70 text-sm">{videoError}</p>
                      </div>
                    )}

                    {!videoResultUrl && !videoLoading && !videoError && (
                      <div className="text-center opacity-30">
                        <div className="w-24 h-24 border-2 border-dashed border-slate-500 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                          <Film className="w-8 h-8 text-slate-500" />
                        </div>
                        <p className="text-slate-400">Upload image and video, then generate</p>
                      </div>
                    )}

                    {videoLoading && (
                      <div className="text-center">
                        <div className="relative w-20 h-20 mx-auto mb-6">
                          <div className="absolute inset-0 border-4 border-pink-500/30 rounded-full"></div>
                          <div className="absolute inset-0 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                        <p className="text-pink-400 animate-pulse font-medium">Generating your video...</p>
                        <p className="text-slate-500 text-xs mt-2">Video generation may take several minutes</p>
                      </div>
                    )}

                    {videoResultUrl && !videoLoading && (
                      <div className="relative w-full h-full flex items-center justify-center">
                        <video
                          src={videoResultUrl}
                          controls
                          autoPlay
                          loop
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

          {scheduleModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-semibold">Schedule Content</h3>
                    <p className="text-xs text-slate-500">Save this generated image to Notion Content Calendar</p>
                  </div>
                  <button
                    onClick={closeScheduleModal}
                    className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                    aria-label="Close schedule modal"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-4 overflow-y-auto space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Content Title</label>
                      <input
                        type="text"
                        value={scheduleTitle}
                        onChange={(e) => setScheduleTitle(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Publish Date</label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setScheduleCalendarOpen((prev) => !prev)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-left flex items-center justify-between"
                        >
                          <span>
                            {scheduleDate
                              ? parseInputDate(scheduleDate)?.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
                              : 'Select date'}
                          </span>
                          <CalendarDays className="w-4 h-4 text-slate-400" />
                        </button>

                        {scheduleCalendarOpen && (
                          <div className="absolute z-20 mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 p-3 shadow-2xl">
                            <div className="flex items-center justify-between mb-2">
                              <button
                                type="button"
                                onClick={() => setScheduleCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                                className="p-1 rounded hover:bg-slate-800 text-slate-300"
                                aria-label="Previous month"
                              >
                                <ChevronLeft className="w-4 h-4" />
                              </button>
                              <div className="text-sm text-slate-200 font-medium">
                                {scheduleCalendarMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                              </div>
                              <button
                                type="button"
                                onClick={() => setScheduleCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                                className="p-1 rounded hover:bg-slate-800 text-slate-300"
                                aria-label="Next month"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>

                            <div className="grid grid-cols-7 gap-1 text-[10px] text-slate-500 mb-1">
                              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                                <div key={day} className="text-center py-1">{day}</div>
                              ))}
                            </div>

                            <div className="grid grid-cols-7 gap-1">
                              {(() => {
                                const year = scheduleCalendarMonth.getFullYear();
                                const month = scheduleCalendarMonth.getMonth();
                                const firstDay = new Date(year, month, 1);
                                const dayOffset = (firstDay.getDay() + 6) % 7; // Monday first
                                const daysInMonth = new Date(year, month + 1, 0).getDate();
                                const totalCells = Math.ceil((dayOffset + daysInMonth) / 7) * 7;
                                const selectedDate = parseInputDate(scheduleDate);

                                return Array.from({ length: totalCells }, (_, idx) => {
                                  const day = idx - dayOffset + 1;
                                  if (day < 1 || day > daysInMonth) {
                                    return <div key={`empty-${idx}`} className="h-8" />;
                                  }

                                  const cellDate = new Date(year, month, day);
                                  const isSelected = selectedDate &&
                                    cellDate.getFullYear() === selectedDate.getFullYear() &&
                                    cellDate.getMonth() === selectedDate.getMonth() &&
                                    cellDate.getDate() === selectedDate.getDate();
                                  const isToday = (() => {
                                    const now = new Date();
                                    return cellDate.getFullYear() === now.getFullYear() &&
                                      cellDate.getMonth() === now.getMonth() &&
                                      cellDate.getDate() === now.getDate();
                                  })();

                                  return (
                                    <button
                                      key={`day-${day}`}
                                      type="button"
                                      onClick={() => {
                                        setScheduleDate(formatDateForInput(cellDate));
                                        setScheduleCalendarOpen(false);
                                      }}
                                      className={`h-8 rounded text-xs transition-colors ${isSelected
                                        ? 'bg-indigo-600 text-white'
                                        : isToday
                                          ? 'bg-slate-800 text-slate-200 border border-slate-700'
                                          : 'text-slate-300 hover:bg-slate-800'
                                        }`}
                                    >
                                      {day}
                                    </button>
                                  );
                                });
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Platform</label>
                    {calendarPlatformOptions.length > 0 ? (
                      <select
                        value={schedulePlatform}
                        onChange={(e) => setSchedulePlatform(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                      >
                        <option value="">-- Select Platform --</option>
                        {calendarPlatformOptions.map((platform) => (
                          <option key={platform} value={platform}>{platform}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={schedulePlatform}
                        onChange={(e) => setSchedulePlatform(e.target.value)}
                        placeholder="Enter platform name"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                      />
                    )}
                  </div>

                  {scheduleImageUrl && (
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Image Preview</label>
                      <img
                        src={scheduleImageUrl}
                        alt="To be scheduled"
                        className="w-24 h-24 rounded-lg object-cover border border-slate-700"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs text-slate-500 mb-2">Already Scheduled on {scheduleDate || 'selected date'}</label>
                    <div className="max-h-52 overflow-y-auto space-y-2 border border-slate-800 rounded-lg p-2 bg-slate-950/50">
                      {scheduledItemsLoading ? (
                        <div className="text-slate-500 text-xs flex items-center">
                          <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                          Loading scheduled content...
                        </div>
                      ) : scheduledItemsOnDate.length === 0 ? (
                        <div className="text-slate-600 text-xs">No scheduled content on this date.</div>
                      ) : (
                        scheduledItemsOnDate.map((item) => (
                          <div key={item.id} className="flex items-center gap-2 p-2 rounded-md border border-slate-800 bg-slate-900/50">
                            {item.imageUrl ? (
                              <img src={item.imageUrl} alt={item.title} className="w-10 h-10 rounded object-cover border border-slate-700" />
                            ) : (
                              <div className="w-10 h-10 rounded bg-slate-800 border border-slate-700" />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="text-xs text-slate-200 truncate">{item.title || 'Untitled'}</div>
                              <div className="text-[10px] text-slate-500">{item.platform || 'Unknown platform'}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {scheduleError && (
                    <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2">
                      {scheduleError}
                    </div>
                  )}
                  {scheduleSuccess && (
                    <div className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg p-2">
                      {scheduleSuccess}
                    </div>
                  )}
                </div>

                <div className="p-4 border-t border-slate-800 flex items-center justify-end gap-2">
                  <button
                    onClick={closeScheduleModal}
                    className="px-3 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={scheduleGeneratedContent}
                    disabled={scheduleSaving || !scheduleDate || !schedulePlatform}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${scheduleSaving || !scheduleDate || !schedulePlatform
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                      }`}
                  >
                    {scheduleSaving ? 'Scheduling...' : 'Schedule'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </PasswordGate>
  );
}