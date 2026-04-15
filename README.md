# DocuPhoto - Professional Passport & ID Photo Creator

DocuPhoto is a web application designed to help users easily create passport and ID photos that meet strict government specifications.

## Features

- **Local Background Removal**: Automatically removes the background from your photos. This process runs entirely locally in your browser using WebAssembly (WASM), ensuring your photos are never uploaded to any external server.
- **Manual Cropping Tool**: Adjust the composition of your photo with a crop box locked to the aspect ratio of your selected country's template.
- **Country Templates**: Pre-configured dimensions for various countries (US, UK, EU, Australia, Canada, China, Japan, India) and a custom size option.
- **Adjustable Eye Level Guide**: A visual guide to help you align the subject's eyes according to biometric standards.
- **Customizable Background Colors**: Choose from standard background colors required by different countries.
- **Export Options**: Export in JPEG or PNG format. Adjust JPEG quality to meet specific file size limits (e.g., under 200KB).
- **Custom DPI Export**: Choose between 300 DPI (Standard), 600 DPI (High Quality), and 1200 DPI (Maximum) for printing or other uses.

## Privacy & Security

Your privacy is our priority. The background removal process utilizes `@imgly/background-removal`, which executes locally within your browser. **No images are sent to any cloud service, API, or external server.**

## Technical Stack

- **Frontend**: React, Vite, Tailwind CSS
- **UI Components**: shadcn/ui
- **Image Processing**: `@imgly/background-removal`, `react-image-crop`
- **Icons**: Lucide React

## Getting Started

1. Install dependencies: `npm install`
2. Start the development server: `npm run dev`
3. Build for production: `npm run build`
