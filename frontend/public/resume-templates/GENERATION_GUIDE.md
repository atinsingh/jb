# Template Preview Generation Guide

This guide explains how to generate resume template preview images for the AI Resume Builder.

## Quick Start

### Option 1: Automated Generation (Recommended)

1. **Install Puppeteer** (if not already installed):
   ```bash
   cd frontend
   npm install --save-dev puppeteer
   ```

2. **Run the generation script**:
   ```bash
   npm run generate-templates
   ```

   This will automatically:
   - Launch a headless browser
   - Load the HTML template generator
   - Screenshot each template preview
   - Save PNG files to `public/resume-templates/`

### Option 2: Manual Generation

1. **Open the HTML generator**:
   ```bash
   open frontend/public/resume-templates/generate-previews.html
   ```
   Or navigate to the file in your browser.

2. **Click "Download"** on each template card to save the PNG.

3. **Move files** to `frontend/public/resume-templates/` if needed.

## Current Templates

The following templates are available:

1. **Modern** - Clean, contemporary design with gradient background
2. **Professional** - Traditional, formal layout with blue accents
3. **Creative** - Bold design with warm colors
4. **Minimal** - Simple and elegant, focuses on content
5. **Executive** - Sophisticated dark theme with gold accents
6. **ATS Friendly** - Optimized for applicant tracking systems

## File Structure

```
frontend/
├── public/
│   └── resume-templates/
│       ├── generate-previews.html    # HTML generator
│       ├── modern.png                # Generated preview
│       ├── professional.png
│       ├── creative.png
│       ├── minimal.png
│       ├── executive.png
│       └── ats-friendly.png
└── scripts/
    ├── generate-all-templates.js     # Automation script
    └── README.md                     # Script documentation
```

## Adding New Templates

To add a new template:

1. **Add template styles** to `generate-previews.html`:
   ```css
   .new-template-preview {
       /* Your styles */
   }
   ```

2. **Add template HTML** in the template grid:
   ```html
   <div class="template-card">
       <div class="template-name">New Template</div>
       <div class="template-preview new-template-preview" id="new-template-preview">
           <!-- Template content -->
       </div>
       <button onclick="downloadTemplate('new-template-preview', 'new-template.png')">Download</button>
   </div>
   ```

3. **Update the automation script** (`scripts/generate-all-templates.js`):
   ```javascript
   const TEMPLATES = [
       // ... existing templates
       { id: 'new-template', name: 'New Template' },
   ];
   ```

4. **Update the resume builder** (`src/pages/candidate/resume-builder/index.jsx`):
   ```javascript
   const templates = [
       // ... existing templates
       {
           id: 'new-template',
           name: 'New Template',
           description: 'Description here',
           preview: '/resume-templates/new-template.png',
           color: 'blue',
           category: 'Category',
       },
   ];
   ```

5. **Generate the preview**:
   ```bash
   npm run generate-templates
   ```

## Troubleshooting

### Puppeteer Installation Issues

**macOS:**
```bash
brew install chromium
```

**Linux:**
```bash
sudo apt-get install -y chromium-browser
```

**Windows:**
Puppeteer should work out of the box.

### Browser Launch Errors

- Ensure Chrome/Chromium is installed
- Check file permissions
- Try running with elevated permissions if needed

### Template Not Found

- Verify the template ID exists in `generate-previews.html`
- Check that element ID matches: `{template-id}-preview`
- Ensure HTML file is properly formatted

## Image Specifications

- **Format**: PNG
- **Size**: 600x800px (standard resume aspect ratio)
- **Resolution**: 2x (1200x1600px actual size) for high quality
- **File Size**: Typically 50-200KB per image

## Notes

- Images are automatically optimized by Next.js when served
- The resume builder will show placeholders if images are missing
- All templates should follow a consistent design language
- Consider ATS compatibility when designing new templates

