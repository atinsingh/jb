# Resume Template Images

This folder contains the template preview images for the AI Resume Builder.

## Adding Template Images

To add template images from the PDF design document:

1. **Extract images from the PDF**:
   - Open the PDF file (`resume_builder copy.pdf`)
   - Extract each template preview image
   - Save them with the following names:

2. **Required image files**:
   - `modern.png` - Modern template preview
   - `professional.png` - Professional template preview
   - `creative.png` - Creative template preview
   - `minimal.png` - Minimal template preview
   - `executive.png` - Executive template preview
   - `ats-friendly.png` - ATS Friendly template preview

3. **Image specifications**:
   - **Format**: PNG, JPG, or WebP
   - **Recommended size**: 600x800px or similar aspect ratio
   - **File size**: Keep under 500KB per image for optimal performance

4. **Place images here**:
   - Save all template images directly in this folder: `frontend/public/resume-templates/`

## Current Status

The resume builder is configured to display these images. If an image is missing, a placeholder will be shown automatically.

## Notes

- Images are loaded from the `/resume-templates/` path (public folder)
- The code will automatically fall back to placeholders if images don't exist
- Images should be high-quality previews of the actual resume templates

