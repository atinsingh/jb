# Template Generation Scripts

This directory contains scripts for automatically generating resume template preview images.

## Files

- `generate-all-templates.js` - Automated script using Puppeteer to generate all template previews

## Setup

1. Install dependencies:
```bash
npm install --save-dev puppeteer
```

## Usage

### Automated Generation (Recommended)

Generate all templates automatically:

```bash
npm run generate-templates
```

Or directly:

```bash
node scripts/generate-all-templates.js
```

This will:
- Launch a headless browser
- Load the HTML template generator
- Screenshot each template preview
- Save PNG files to `public/resume-templates/`

### Manual Generation

1. Open `public/resume-templates/generate-previews.html` in your browser
2. Click "Download" on each template you want to generate
3. Move the downloaded files to `public/resume-templates/`

## Output

Generated images will be saved to:
```
frontend/public/resume-templates/
  - modern.png
  - professional.png
  - creative.png
  - minimal.png
  - executive.png
  - ats-friendly.png
```

## Troubleshooting

### Puppeteer Installation Issues

If you encounter issues installing Puppeteer:

**macOS:**
```bash
brew install chromium
```

**Linux:**
```bash
sudo apt-get install -y chromium-browser
```

**Windows:**
Puppeteer should work out of the box, but if you have issues, install Chrome/Chromium manually.

### Browser Launch Errors

If the browser fails to launch:
- Ensure you have Chrome/Chromium installed
- Try running with `--no-sandbox` flag (already included in script)
- Check file permissions

### Template Not Found

If a template is skipped:
- Verify the template ID exists in `generate-previews.html`
- Check that the element ID matches: `{template-id}-preview`
- Ensure the HTML file is properly formatted

## Notes

- Images are generated at 2x resolution (1200x1600px) for high quality
- Each template preview is 600x800px (standard resume aspect ratio)
- The script automatically skips templates that don't exist in the HTML

