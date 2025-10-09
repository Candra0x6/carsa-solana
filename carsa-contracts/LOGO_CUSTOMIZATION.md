# 🎨 LOKAL Token Logo Customization

## Current Logo
The default logo is located at: `lokal-token-logo.svg`

## Customizing the Logo

### Option 1: Edit the SVG
Edit `lokal-token-logo.svg` directly to customize:
- Colors (change fill values)
- Text (modify the LOKAL text)
- Size (adjust viewBox and elements)
- Effects (add gradients, shadows, etc.)

### Option 2: Replace with Your Own
1. Create your logo as PNG, SVG, or JPEG (recommended: 200x200px or larger)
2. Name it `lokal-token-logo.[ext]` 
3. The upload script will automatically use it

### Option 3: Use External URL
1. Upload your logo to a permanent hosting service
2. Update `lokal-token-metadata.json` with the URL:
   ```json
   "image": "https://your-domain.com/your-logo.png"
   ```

## Recommendations

### File Format
- **SVG**: Best for scalability and small file size
- **PNG**: Good for detailed graphics with transparency
- **JPEG**: Good for photographs, but no transparency

### Size
- Minimum: 200x200px
- Recommended: 400x400px or 512x512px
- Maximum: 1000x1000px (to keep upload costs low)

### Design Guidelines
- Use high contrast for readability
- Keep text legible at small sizes
- Consider how it looks on both light and dark backgrounds
- Ensure it represents the LOKAL/CARSA brand

## Updating After Upload

If you need to update the logo after creating metadata:
1. Update the image file or URL
2. Run: `./metadata-manager.sh update`
3. The new image will be uploaded and metadata updated

## Arweave Considerations

- Images uploaded to Arweave are permanent
- Each upload costs a small amount of SOL/AR
- Larger files cost more to upload
- Consider optimizing images before upload
