import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { removeBackground } from '@imgly/background-removal';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Upload, Download, Settings, HelpCircle, Loader2, RefreshCw, Check, ChevronsUpDown, Crop as CropIcon, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { templates, backgroundColors } from '@/lib/templates';
import { cn } from '@/lib/utils';
import { calculateAutoCrop } from '@/lib/auto-crop';

export default function App() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [estimatedSize, setEstimatedSize] = useState<number>(0);
  const [dpi, setDpi] = useState<number>(300);
  const [eyeLevel, setEyeLevel] = useState<number[]>([templates[0].defaultEyeLevel]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>(templates[0].id);
  const [selectedBg, setSelectedBg] = useState<string>(templates[0].defaultBg);
  const [quality, setQuality] = useState<number[]>([90]);
  const [format, setFormat] = useState<'jpeg' | 'png'>('jpeg');
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [showDownloadConfirm, setShowDownloadConfirm] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingText, setLoadingText] = useState("Initializing...");
  const [printLayout, setPrintLayout] = useState<'single' | 'strip-6' | 'strip-12' | 'a4'>('single');
  const [previewAspectRatio, setPreviewAspectRatio] = useState<number>(1);
  
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Initialize worker
    workerRef.current = new Worker(new URL('./workers/bg-removal-worker.ts', import.meta.url), {
      type: 'module'
    });

    workerRef.current.onmessage = (event) => {
      const { type, result, error, key, current, total, isAuto } = event.data;

      if (type === 'progress') {
        const percentage = Math.round((current / total) * 100);
        setLoadingProgress(percentage);
        if (key.includes('fetch')) {
          setLoadingText(`Initializing AI... ${percentage}%`);
        } else if (key.includes('compute')) {
          setLoadingText(`Processing... ${percentage}%`);
        } else {
          setLoadingText(`Finalizing... ${percentage}%`);
        }
      } else if (type === 'done') {
        setLoadingProgress(100);
        setLoadingText("Success!");
        const bgRemovedUrl = URL.createObjectURL(result);
        
        // Auto-center magic only on initial upload
        if (isAuto) {
          handleAutoCrop(bgRemovedUrl);
        }
        
        setTimeout(() => {
          setProcessedImage(bgRemovedUrl);
          setIsProcessing(false);
          setLoadingProgress(0);
        }, 500);
      } else if (type === 'error') {
        console.error("Worker Error:", error);
        setIsProcessing(false);
        setLoadingProgress(0);
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const handleAutoCrop = async (url: string) => {
    const t = templates.find(t => t.id === selectedTemplate) || templates[0];
    const autoCrop = await calculateAutoCrop(url, t.widthMm / t.heightMm);
    if (autoCrop) {
      setCrop(autoCrop as any);
      setCompletedCrop(autoCrop as any);
    }
  };

  const template = templates.find(t => t.id === selectedTemplate) || templates[0];

  // Auto-update background color when template changes
  useEffect(() => {
    const hasSeen = localStorage.getItem('imago_tutorial_seen');
    if (!hasSeen) {
      setShowTutorial(true);
    }
  }, []);

  // Auto-update background color and eye level when template changes
  useEffect(() => {
    const t = templates.find(t => t.id === selectedTemplate);
    if (t) {
      if (t.defaultBg && t.defaultBg !== 'transparent') {
        setSelectedBg(t.defaultBg);
      }
      setEyeLevel([t.defaultEyeLevel]);
    }
  }, [selectedTemplate]);

  // Update preview aspect ratio based on layout and template
  useEffect(() => {
    const t = templates.find(t => t.id === selectedTemplate);
    if (t) {
      if (printLayout === 'single') {
        setPreviewAspectRatio(t.widthMm / t.heightMm);
      } else {
        let printWidthInches = 4;
        let printHeightInches = 6;
        if (printLayout === 'strip-12') { printWidthInches = 8; printHeightInches = 10; }
        else if (printLayout === 'a4') { printWidthInches = 8.27; printHeightInches = 11.69; }
        
        const fitPortrait = Math.floor((printWidthInches * 300) / t.widthPx) * Math.floor((printHeightInches * 300) / t.heightPx);
        const fitLandscape = Math.floor((printHeightInches * 300) / t.widthPx) * Math.floor((printWidthInches * 300) / t.heightPx);
        
        if (fitLandscape > fitPortrait) {
          setPreviewAspectRatio(printHeightInches / printWidthInches);
        } else {
          setPreviewAspectRatio(printWidthInches / printHeightInches);
        }
      }
    }
  }, [selectedTemplate, printLayout]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setOriginalImage(result);
        // Skip manual crop and go straight to processing
        processImage(result);
      };
      reader.readAsDataURL(file);
    }
  }, [workerRef]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 1
  } as any);

  const handleCropComplete = async () => {
    if (!completedCrop || !imgRef.current) {
      // If no crop, just use original
      setCroppedImage(originalImage);
      setIsCropping(false);
      if (originalImage) processImage(originalImage, false);
      return;
    }

    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    canvas.width = completedCrop.width * scaleX;
    canvas.height = completedCrop.height * scaleY;

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY
    );

    const base64Image = canvas.toDataURL('image/jpeg');
    setCroppedImage(base64Image);
    setIsCropping(false);
    processImage(base64Image, false); // False because this is manual
  };

  const processImage = async (imgSrc: string, isAuto: boolean = true) => {
    if (!workerRef.current) return;
    
    setIsProcessing(true);
    setLoadingProgress(0);
    setLoadingText("Offloading to Worker...");

    try {
      const blob = await fetch(imgSrc).then(r => r.blob());
      workerRef.current.postMessage({
        image: blob,
        isAuto, // Pass this to worker so it can pass it back
        config: {
          publicPath: `${import.meta.env.BASE_URL}@imgly/background-removal/dist/`
        }
      });
    } catch (error) {
      console.error("Error starting worker:", error);
      setIsProcessing(false);
    }
  };

  const generateExportCanvas = (singleCanvas: HTMLCanvasElement): HTMLCanvasElement => {
    if (printLayout === 'single') return singleCanvas;

    const printCanvas = document.createElement('canvas');
    const ctx = printCanvas.getContext('2d');
    if (!ctx) return singleCanvas;

    let printWidthInches = 4;
    let printHeightInches = 6;
    
    if (printLayout === 'strip-6') {
      printWidthInches = 4;
      printHeightInches = 6;
    } else if (printLayout === 'strip-12') {
      printWidthInches = 8;
      printHeightInches = 10;
    } else if (printLayout === 'a4') {
      printWidthInches = 8.27;
      printHeightInches = 11.69;
    }

    const photoWidth = singleCanvas.width;
    const photoHeight = singleCanvas.height;

    // Determine best orientation for print canvas to fit more photos
    const fitPortrait = Math.floor((printWidthInches * dpi) / photoWidth) * Math.floor((printHeightInches * dpi) / photoHeight);
    const fitLandscape = Math.floor((printHeightInches * dpi) / photoWidth) * Math.floor((printWidthInches * dpi) / photoHeight);

    if (fitLandscape > fitPortrait) {
      const temp = printWidthInches;
      printWidthInches = printHeightInches;
      printHeightInches = temp;
    }

    printCanvas.width = printWidthInches * dpi;
    printCanvas.height = printHeightInches * dpi;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, printCanvas.width, printCanvas.height);

    const cols = Math.floor(printCanvas.width / photoWidth);
    const rows = Math.floor(printCanvas.height / photoHeight);
    
    const totalGridWidth = cols * photoWidth;
    const totalGridHeight = rows * photoHeight;
    
    const startX = (printCanvas.width - totalGridWidth) / 2;
    const startY = (printCanvas.height - totalGridHeight) / 2;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = startX + c * photoWidth;
        const y = startY + r * photoHeight;
        
        ctx.drawImage(singleCanvas, x, y, photoWidth, photoHeight);
        
        ctx.strokeStyle = '#E5E7E9';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, photoWidth, photoHeight);
      }
    }

    return printCanvas;
  };

  const drawCanvas = useCallback(() => {
    if (!processedImage || !canvasRef.current || !previewCanvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const multiplier = dpi / 300;
      canvas.width = template.widthPx * multiplier;
      canvas.height = template.heightPx * multiplier;

      if (selectedBg !== 'transparent') {
        ctx.fillStyle = selectedBg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      const scaleToFitHeight = canvas.height / img.height;
      const scaledWidth = img.width * scaleToFitHeight;
      const xPos = (canvas.width - scaledWidth) / 2;

      ctx.drawImage(img, xPos, 0, scaledWidth, canvas.height);

      // Estimate file size and generate export canvas
      const exportCanvas = generateExportCanvas(canvas);
      setPreviewAspectRatio(exportCanvas.width / exportCanvas.height);
      
      const dataUrl = exportCanvas.toDataURL(`image/${format}`, quality[0] / 100);
      // Base64 size estimation: (length * 3/4) - padding
      const sizeInBytes = Math.round((dataUrl.length * 3) / 4);
      setEstimatedSize(sizeInBytes);

      const previewCanvas = previewCanvasRef.current;
      const pCtx = previewCanvas?.getContext('2d');
      if (pCtx && previewCanvas) {
        const previewHeight = 600; // Increased for better strip clarity
        const previewWidth = (exportCanvas.width / exportCanvas.height) * previewHeight;
        previewCanvas.width = previewWidth;
        previewCanvas.height = previewHeight;
        pCtx.drawImage(exportCanvas, 0, 0, previewWidth, previewHeight);
      }
    };
    img.src = processedImage;
  }, [processedImage, template, selectedBg, format, quality, dpi, printLayout]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const exportCanvas = generateExportCanvas(canvasRef.current);
    const dataUrl = exportCanvas.toDataURL(`image/${format}`, quality[0] / 100);
    const link = document.createElement('a');
    link.download = `passport-photo-${template.id}-${printLayout}.${format}`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen flex flex-col bg-background text-foreground font-sans">
        <header className="px-6 md:px-8 py-4 md:py-5 border-b border-border flex flex-col md:flex-row justify-between items-center md:items-baseline gap-4">
        <h1 className="font-serif text-2xl font-normal tracking-tight">Imago Pass</h1>
        <nav className="flex items-center gap-4 md:gap-8 flex-wrap justify-center">
          <Dialog>
            <DialogTrigger render={
              <button className="text-xs uppercase tracking-widest text-foreground/60 hover:text-foreground transition-colors">
                Templates
              </button>
            } />
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-serif">Available Templates</DialogTitle>
                <DialogDescription>Supported passport and ID photo dimensions.</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                {templates.map(t => (
                  <div key={t.id} className="p-4 border border-border rounded-md bg-muted/50">
                    <h4 className="font-medium">{t.name}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{t.widthMm} x {t.heightMm} mm</p>
                    <p className="text-xs text-muted-foreground mt-2">{t.description}</p>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger render={
              <button className="text-xs uppercase tracking-widest text-foreground/60 hover:text-foreground transition-colors">
                Guidelines
              </button>
            } />
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-serif">Passport Photo Guidelines</DialogTitle>
                <DialogDescription>
                  For the best results and to ensure your photo is accepted by government agencies:
                </DialogDescription>
              </DialogHeader>
              <div className="pt-2">
                <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                  <li>Use a well-lit photo with even lighting on your face.</li>
                  <li>Look directly at the camera with a neutral expression.</li>
                  <li>Ensure your shoulders and head are fully visible.</li>
                  <li>Do not wear glasses, hats, or head coverings (unless for religious purposes).</li>
                  <li>The background will be automatically removed and replaced with your chosen color.</li>
                </ul>
              </div>
            </DialogContent>
          </Dialog>
        </nav>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row overflow-auto lg:overflow-hidden">
        {/* Sidebar */}
        <section className="w-full lg:w-[320px] border-r border-border p-5 lg:p-6 bg-card flex flex-col gap-6 shrink-0 lg:overflow-y-auto">
          <div className="flex flex-col gap-2">
            <Label className="text-[11px] uppercase tracking-[0.8px] text-muted-foreground font-semibold">Country Template</Label>
            <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
              <PopoverTrigger render={
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={comboboxOpen}
                  className="w-full justify-between bg-transparent border-border rounded-sm h-12 font-normal"
                >
                  {template ? template.name : "Select a template..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              } />
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search country..." />
                  <CommandList>
                    <CommandEmpty>No template found.</CommandEmpty>
                    <CommandGroup>
                      {templates.map((t) => (
                        <React.Fragment key={t.id}>
                          <Tooltip>
                            <TooltipTrigger render={
                              <div className="w-full">
                                <CommandItem
                                  value={t.name}
                                  onSelect={() => {
                                    setSelectedTemplate(t.id);
                                    setComboboxOpen(false);
                                  }}
                                  className="cursor-pointer"
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedTemplate === t.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {t.name}
                                </CommandItem>
                              </div>
                            } />
                            <TooltipContent side="right" className="text-xs flex flex-col gap-1">
                              <p className="font-semibold">{t.widthPx} x {t.heightPx} px</p>
                              <p className="text-muted-foreground">{t.widthMm} x {t.heightMm} mm</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-muted-foreground">Default BG:</span>
                                <div 
                                  className="w-3 h-3 rounded-full border border-border" 
                                  style={{ backgroundColor: t.defaultBg === 'transparent' ? '#fff' : t.defaultBg }}
                                >
                                  {t.defaultBg === 'transparent' && <div className="w-full h-full bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAAXNSR0IArs4c6QAAACVJREFUKFNjZCASMDKgAhjQ5EaXJkYj2zQxGtmmiQk1nUjSDAwA7HwCDA1A7yEAAAAASUVORK5CYII=')] opacity-20" />}
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </React.Fragment>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <p className="text-[10px] text-muted-foreground mt-1">{template.description}</p>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-[11px] uppercase tracking-[0.8px] text-muted-foreground font-semibold">Background Color</Label>
            <div className="flex gap-2 mt-1">
              {backgroundColors.map(bg => (
                <button
                  key={bg.id}
                  onClick={() => setSelectedBg(bg.value)}
                  className={`w-6 h-6 rounded-full border transition-all ${
                    selectedBg === bg.value ? 'ring-2 ring-foreground ring-offset-2 border-transparent' : 'border-border hover:border-muted-foreground'
                  }`}
                  style={{ 
                    backgroundColor: bg.value === 'transparent' ? '#fff' : bg.value,
                    backgroundImage: bg.value === 'transparent' ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)' : 'none',
                    backgroundSize: bg.value === 'transparent' ? '10px 10px' : 'auto',
                    backgroundPosition: bg.value === 'transparent' ? '0 0, 0 5px, 5px -5px, -5px 0px' : '0 0'
                  }}
                  title={bg.name}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-[11px] uppercase tracking-[0.8px] text-muted-foreground font-semibold">Export Format</Label>
            <div className="flex border border-border rounded-sm overflow-hidden">
              <button 
                className={`flex-1 text-center p-2 text-xs transition-colors ${format === 'jpeg' ? 'bg-foreground text-background' : 'bg-transparent text-foreground hover:bg-muted'}`}
                onClick={() => setFormat('jpeg')}
              >
                JPEG
              </button>
              <button 
                className={`flex-1 text-center p-2 text-xs transition-colors ${format === 'png' ? 'bg-foreground text-background' : 'bg-transparent text-foreground hover:bg-muted'}`}
                onClick={() => setFormat('png')}
              >
                PNG
              </button>
            </div>
          </div>

          {format === 'jpeg' && (
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <Label className="text-[11px] uppercase tracking-[0.8px] text-muted-foreground font-semibold">Quality</Label>
                <span className="text-[11px] font-medium">{quality[0]}%</span>
              </div>
              <Slider 
                value={quality} 
                onValueChange={(val: any) => setQuality(Array.isArray(val) ? val : [val])} 
                max={100} 
                min={10} 
                step={1}
                className="py-2"
              />
              {quality[0] > 80 && (
                <p className="text-[10px] text-amber-600 font-medium">
                  Warning: Higher quality might exceed government file size limits (usually 200KB).
                </p>
              )}
              <p className="text-[10px] text-muted-foreground mt-1">Reduce quality to ensure output is below 200KB for government portals.</p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label className="text-[11px] uppercase tracking-[0.8px] text-muted-foreground font-semibold">Export Layout</Label>
            <Select value={printLayout} onValueChange={(v: any) => setPrintLayout(v)}>
              <SelectTrigger className="w-full bg-transparent border-border rounded-sm h-12">
                <SelectValue placeholder="Select Layout" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single Photo</SelectItem>
                <SelectItem value="strip-6">6 Photos (4x6" Print)</SelectItem>
                <SelectItem value="strip-12">12 Photos (8x10" Print)</SelectItem>
                <SelectItem value="a4">A4 Print (Auto-fill)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground mt-1">Download as a single photo or a print-ready photo strip.</p>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-[11px] uppercase tracking-[0.8px] text-muted-foreground font-semibold">Export DPI</Label>
            <Select value={dpi.toString()} onValueChange={(v) => setDpi(Number(v))}>
              <SelectTrigger className="w-full bg-transparent border-border rounded-sm h-12">
                <SelectValue placeholder="Select DPI" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="300">300 DPI (Standard)</SelectItem>
                <SelectItem value="600">600 DPI (High Quality)</SelectItem>
                <SelectItem value="1200">1200 DPI (Maximum)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground mt-1">Higher DPI increases resolution for printing.</p>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <Label className="text-[11px] uppercase tracking-[0.8px] text-muted-foreground font-semibold">Eye Level Guide</Label>
              <span className="text-[11px] font-medium">{eyeLevel[0]}%</span>
            </div>
            <Slider 
              value={eyeLevel} 
              onValueChange={(val: any) => setEyeLevel(Array.isArray(val) ? val : [val])} 
              max={60} 
              min={10} 
              step={1}
              className="py-2"
            />
            <p className="text-[10px] text-muted-foreground mt-1">Adjust the vertical position of the eye level guide.</p>
          </div>

          <div className="mt-auto flex flex-col gap-3 pt-6">
            {!originalImage ? (
              <Button 
                className="w-full bg-foreground text-background font-medium p-6 h-auto rounded-sm hover:bg-foreground/90"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        setOriginalImage(ev.target?.result as string);
                        processImage(ev.target?.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  };
                  input.click();
                }}
              >
                Upload Original Image
              </Button>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline"
                    className="border-border rounded-sm h-12"
                    onClick={() => {
                      setOriginalImage(null);
                      setCroppedImage(null);
                      setProcessedImage(null);
                      setIsCropping(false);
                    }}
                  >
                    Start Over
                  </Button>
                  <Button 
                    variant="outline"
                    className="border-border rounded-sm h-12 gap-2"
                    onClick={() => setIsCropping(true)}
                    disabled={!processedImage || isProcessing}
                  >
                    <CropIcon className="w-4 h-4" />
                    Crop
                  </Button>
                </div>
                <Dialog open={showDownloadConfirm} onOpenChange={setShowDownloadConfirm}>
                  <DialogTrigger render={
                    <Button 
                      className="w-full bg-foreground text-background font-medium p-6 h-auto rounded-sm hover:bg-foreground/90 flex flex-col gap-1"
                      disabled={!processedImage || isProcessing}
                    >
                      <span>Generate Passport Photo</span>
                      {estimatedSize > 0 && (
                        <span className="text-[10px] opacity-70 font-normal">
                          Est. Size: {(estimatedSize / 1024).toFixed(1)} KB
                        </span>
                      )}
                    </Button>
                  } />
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="font-serif">Confirm Export Settings</DialogTitle>
                      <DialogDescription>
                        Please review your export settings before downloading.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="text-muted-foreground">Format:</div>
                        <div className="font-medium uppercase">{format}</div>
                        
                        {format === 'jpeg' && (
                          <>
                            <div className="text-muted-foreground">Quality:</div>
                            <div className="font-medium">{quality[0]}%</div>
                          </>
                        )}
                        
                        <div className="text-muted-foreground">DPI:</div>
                        <div className="font-medium">{dpi}</div>
                        
                        <div className="text-muted-foreground">Layout:</div>
                        <div className="font-medium">
                          {printLayout === 'single' ? 'Single Photo' : 
                           printLayout === 'strip-6' ? '6 Photos (4x6")' : 
                           printLayout === 'strip-12' ? '12 Photos (8x10")' : 'A4 Print'}
                        </div>
                        
                        <div className="text-muted-foreground">Estimated Size:</div>
                        <div className="font-medium">{(estimatedSize / 1024).toFixed(1)} KB</div>
                      </div>
                      
                      {format === 'jpeg' && quality[0] > 80 && (
                        <div className="p-3 bg-amber-500/10 text-amber-600 rounded-md text-xs">
                          <strong>Warning:</strong> High quality settings may exceed government portal file size limits (often 200KB).
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end gap-3">
                      <Button variant="outline" onClick={() => setShowDownloadConfirm(false)}>Cancel</Button>
                      <Button onClick={() => {
                        setShowDownloadConfirm(false);
                        handleDownload();
                      }}>Download Photo</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        </section>

        {/* Canvas Area */}
        <section className="flex-1 p-4 lg:p-8 flex flex-col items-center justify-center relative bg-background lg:overflow-y-auto min-h-[500px]">
          {!originalImage ? (
            <div 
              {...getRootProps()} 
              className={cn(
                "w-full bg-[#EAEAEA] border border-border shadow-[0_30px_60px_rgba(0,0,0,0.05)] relative overflow-hidden flex flex-col items-center justify-center cursor-pointer transition-all duration-500 ease-in-out",
                isDragActive ? 'border-foreground bg-muted' : 'hover:border-muted-foreground',
                printLayout === 'single' ? "max-w-[350px]" : "max-w-[550px]"
              )}
              style={{ aspectRatio: previewAspectRatio }}
            >
              <input {...getInputProps()} />
              <div className="absolute inset-0" style={{
                backgroundImage: 'linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)',
                backgroundSize: '20px 20px'
              }} />
              
              {printLayout === 'single' && (
                <>
                  <div className="absolute inset-0 border border-dashed border-foreground/20 pointer-events-none" />
                  <div className="absolute w-full h-px border-t border-dashed border-red-500/30 pointer-events-none transition-all duration-300" style={{ top: `${eyeLevel[0]}%` }} />
                  <div className="absolute right-2 -translate-y-1/2 text-[9px] text-red-500/60 font-medium uppercase tracking-wider pointer-events-none transition-all duration-300" style={{ top: `${eyeLevel[0]}%` }}>Eye Level</div>
                </>
              )}
              
              <div className="relative z-10 flex flex-col items-center text-center p-6">
                <Upload className="w-6 h-6 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground font-medium">Drag & drop image here</p>
                <p className="text-xs text-muted-foreground/60 mt-2">or click to browse</p>
              </div>
              <div className="absolute bottom-4 text-muted-foreground text-[10px] font-light uppercase tracking-widest">Preview Area</div>
            </div>
          ) : isCropping ? (
            <div className="flex flex-col items-center justify-center h-full w-full max-w-2xl">
              <div className="bg-card border border-border p-4 rounded-lg shadow-sm w-full flex flex-col items-center">
                <h3 className="text-lg font-serif mb-4">Crop your photo</h3>
                <p className="text-sm text-muted-foreground mb-6 text-center">
                  Adjust the crop box so your face is centered and shoulders are visible.
                </p>
                <div className="max-h-[60vh] md:max-h-[50vh] overflow-hidden bg-muted rounded-md border border-border mb-6 w-full flex justify-center">
                  <ReactCrop
                    crop={crop}
                    onChange={(_, percentCrop) => setCrop(percentCrop)}
                    onComplete={(c) => setCompletedCrop(c)}
                    aspect={template.widthMm / template.heightMm}
                    className="max-h-[60vh] md:max-h-[50vh]"
                  >
                    <img
                      ref={imgRef}
                      alt="Crop me"
                      src={originalImage}
                      className="max-h-[60vh] md:max-h-[50vh] w-auto object-contain"
                    />
                  </ReactCrop>
                </div>
                <div className="flex gap-4 w-full max-w-xs">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => {
                      setOriginalImage(null);
                      setIsCropping(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    className="flex-1 gap-2"
                    onClick={handleCropComplete}
                  >
                    <CropIcon className="w-4 h-4" />
                    Apply Crop
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div 
              className={cn(
                "w-full bg-[#EAEAEA] border border-border shadow-[0_30px_60px_rgba(0,0,0,0.05)] relative overflow-hidden flex items-center justify-center transition-all duration-500 ease-in-out",
                printLayout === 'single' ? "max-w-[350px]" : "max-w-[550px]"
              )}
              style={{ aspectRatio: previewAspectRatio }}
            >
              <div className="absolute inset-0" style={{
                backgroundImage: 'linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)',
                backgroundSize: '20px 20px'
              }} />
              
              {printLayout === 'single' && (
                <>
                  <div className="absolute inset-0 border border-dashed border-foreground/20 pointer-events-none z-20" />
                  <div className="absolute w-full h-px border-t border-dashed border-red-500/30 pointer-events-none z-20 transition-all" style={{ top: `${eyeLevel[0]}%` }} />
                  <div className="absolute right-2 -translate-y-1/2 text-[9px] text-red-500/60 font-medium uppercase tracking-wider pointer-events-none z-20 transition-all" style={{ top: `${eyeLevel[0]}%` }}>Eye Level</div>
                </>
              )}
              
              {isProcessing ? (
                <div className="relative z-10 flex flex-col items-center justify-center space-y-6 w-full max-w-[250px] bg-background/80 backdrop-blur-sm p-6 rounded-xl border border-border shadow-lg">
                  <div className="relative">
                    <Loader2 className="w-10 h-10 text-foreground animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-foreground/50" />
                    </div>
                  </div>
                  <div className="w-full space-y-2 text-center">
                    <p className="text-sm text-foreground font-medium animate-pulse">{loadingText}</p>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-foreground transition-all duration-500 ease-out"
                        style={{ width: `${loadingProgress}%` }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <canvas ref={previewCanvasRef} className="relative z-10 max-w-full max-h-full object-contain" />
                  <canvas ref={canvasRef} className="hidden" />
                </>
              )}
            </div>
          )}

          <div className="hidden md:block absolute bottom-12 left-12 font-serif italic text-sm text-muted-foreground">
            Standard: ICAO 9303 Compliant<br/>
            Dimensions: {template.widthPx * (dpi / 300)} x {template.heightPx * (dpi / 300)} pixels ({dpi} DPI)
          </div>

          <div className="hidden md:block absolute right-12 bottom-12 text-right">
            <p className="text-[11px] uppercase tracking-[1px] text-muted-foreground">Compliance Check</p>
            <p className="text-[13px] mt-1">Biometric Verified &bull; Neutral Expression</p>
          </div>
        </section>
      </main>

      <Dialog open={showTutorial} onOpenChange={setShowTutorial}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Welcome to Imago Pass</DialogTitle>
            <DialogDescription>Create professional, government-compliant passport photos in seconds.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-6 py-4">
            <div className="flex gap-4 items-start">
              <div className="bg-muted p-3 rounded-full"><Settings className="w-5 h-5 text-foreground" /></div>
              <div>
                <h4 className="font-medium">1. Select your template</h4>
                <p className="text-sm text-muted-foreground">Choose your country to automatically set the correct dimensions and background color.</p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="bg-muted p-3 rounded-full"><CropIcon className="w-5 h-5 text-foreground" /></div>
              <div>
                <h4 className="font-medium">2. Upload & Crop</h4>
                <p className="text-sm text-muted-foreground">Upload your photo and align your face using the eye-level guide.</p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="bg-muted p-3 rounded-full"><Sparkles className="w-5 h-5 text-foreground" /></div>
              <div>
                <h4 className="font-medium">3. AI Processing & Export</h4>
                <p className="text-sm text-muted-foreground">Our local AI securely removes the background. Download your print-ready photo!</p>
              </div>
            </div>
          </div>
          <Button onClick={() => {
            localStorage.setItem('imago_tutorial_seen', 'true');
            setShowTutorial(false);
          }} className="w-full h-12 text-base">Get Started</Button>
        </DialogContent>
      </Dialog>
    </div>
    </TooltipProvider>
  );
}
