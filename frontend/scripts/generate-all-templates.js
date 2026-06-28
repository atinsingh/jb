#!/usr/bin/env node

/**
 * Automated Template Preview Generator
 * 
 * This script uses Puppeteer to automatically generate all template preview images
 * from the HTML generator file.
 * 
 * Prerequisites:
 *   npm install --save-dev puppeteer
 * 
 * Usage: 
 *   npm run generate-templates
 *   or
 *   node scripts/generate-all-templates.js
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const TEMPLATES = [
  { id: 'modern', name: 'Modern' },
  { id: 'professional', name: 'Professional' },
  { id: 'creative', name: 'Creative' },
  { id: 'minimal', name: 'Minimal' },
  { id: 'executive', name: 'Executive' },
  { id: 'ats-friendly', name: 'ATS Friendly' },
];

const OUTPUT_DIR = path.join(__dirname, '../public/resume-templates');
const HTML_FILE = path.join(__dirname, '../public/resume-templates/generate-previews.html');

async function generateTemplates() {
  console.log('🚀 Starting template preview generation...\n');

  // Check if HTML file exists
  if (!fs.existsSync(HTML_FILE)) {
    console.error(`❌ HTML file not found: ${HTML_FILE}`);
    console.error('   Please ensure generate-previews.html exists in public/resume-templates/');
    process.exit(1);
  }

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`📁 Created output directory: ${OUTPUT_DIR}`);
  }

  // Launch browser
  console.log('🌐 Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    
    // Set viewport for consistent image sizes (600x800 for resume preview)
    await page.setViewport({
      width: 600,
      height: 800,
      deviceScaleFactor: 2, // Higher resolution (2x)
    });

    // Load HTML file
    const fileUrl = `file://${HTML_FILE}`;
    console.log(`📄 Loading HTML file: ${fileUrl}`);
    await page.goto(fileUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait for page to fully render
    console.log('⏳ Waiting for page to render...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Wait for at least one template element to be visible
    try {
      await page.waitForSelector('#modern-preview', { timeout: 5000 });
      console.log('✅ Page loaded successfully');
    } catch (e) {
      console.log('⚠️  Template elements may not be ready, continuing anyway...');
    }

    let successCount = 0;
    let skipCount = 0;

    // Generate each template
    for (const template of TEMPLATES) {
      try {
        console.log(`\n📸 Generating ${template.name} template...`);
        
        const elementId = `${template.id}-preview`;
        
        // Check if element exists
        const elementExists = await page.$(`#${elementId}`);
        if (!elementExists) {
          console.log(`⚠️  Template ${template.name} (${elementId}) not found in HTML, skipping...`);
          skipCount++;
          continue;
        }

        // Get the element
        const element = await page.$(`#${elementId}`);
        
        // Take screenshot
        const outputPath = path.join(OUTPUT_DIR, `${template.id}.png`);
        await element.screenshot({
          path: outputPath,
          type: 'png',
        });

        // Verify file was created
        if (fs.existsSync(outputPath)) {
          const stats = fs.statSync(outputPath);
          console.log(`✅ Generated: ${outputPath} (${(stats.size / 1024).toFixed(2)} KB)`);
          successCount++;
        } else {
          console.log(`❌ File was not created: ${outputPath}`);
        }
      } catch (error) {
        console.error(`❌ Error generating ${template.name}:`, error.message);
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('✨ Template generation complete!');
    console.log(`✅ Successfully generated: ${successCount} templates`);
    if (skipCount > 0) {
      console.log(`⚠️  Skipped: ${skipCount} templates (not found in HTML)`);
    }
    console.log(`📁 Output directory: ${OUTPUT_DIR}`);
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('\n❌ Error during generation:', error.message);
    if (error.message.includes('net::ERR_FILE_NOT_FOUND')) {
      console.error('   Make sure the HTML file path is correct.');
    }
    process.exit(1);
  } finally {
    await browser.close();
    console.log('\n🔒 Browser closed.');
  }
}

// Check if puppeteer is installed
try {
  require.resolve('puppeteer');
} catch (e) {
  console.error('❌ Puppeteer is not installed!');
  console.error('   Please run: npm install --save-dev puppeteer');
  process.exit(1);
}

// Run the generator
generateTemplates().catch((error) => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});

