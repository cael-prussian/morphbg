# Getting Started with morphbg

Welcome! This guide will help you add morphbg to your website in under 5 minutes.

## What You Need

Just two things:
1. A basic HTML page
2. An internet connection (for CDN access)

No build tools, no npm, no configuration files required.

## Step 1: Add Canvas Element

Add a canvas element to your HTML:

```html
<canvas id="bg-canvas"></canvas>
```

Style it to cover the entire viewport:

```css
#bg-canvas {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: -1;  /* Behind your content */
}
```

## Step 2: Add Content Sections

Add sections with shader attributes:

```html
<section data-shader-system="gs1" data-shader-preset="HERO">
    <h1>Welcome</h1>
    <p>Your content here</p>
</section>

<section data-shader-system="gs2" data-shader-preset="AMBIENT">
    <h2>About Us</h2>
    <p>More content</p>
</section>
```

## Step 3: Load Scripts

Add these two script tags before the closing `</body>` tag:

```html
<script src="https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.0.0/dist/morphbg-all.complete.js"></script>
```

## Complete Example

Here's a full working example:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Site with morphbg</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: system-ui, sans-serif;
        }
        
        #bg-canvas {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: -1;
        }
        
        section {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 2rem;
            color: white;
            text-align: center;
        }
        
        h1 {
            font-size: 4rem;
            margin-bottom: 1rem;
        }
        
        p {
            font-size: 1.5rem;
            max-width: 600px;
        }
    </style>
</head>
<body>
    <canvas id="bg-canvas"></canvas>
    
    <section data-shader-system="gs1" data-shader-preset="HERO">
        <h1>Welcome</h1>
        <p>Beautiful animated backgrounds with zero configuration</p>
    </section>
    
    <section data-shader-system="gs2" data-shader-preset="AMBIENT">
        <h1>Features</h1>
        <p>GPU-accelerated WebGL shaders that run at 60fps</p>
    </section>
    
    <section data-shader-system="gs3" data-shader-preset="READ">
        <h1>Get Started</h1>
        <p>Just add two script tags and you're done!</p>
    </section>
    
    <script src="https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.min.js"></script>
    <script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.0.0/dist/morphbg-all.complete.js"></script>
</body>
</html>
```

## What Happens?

1. The canvas appears behind your content
2. The first visible shader initializes
3. As you scroll, shaders transition smoothly
4. Each section can use different shaders and presets

## Next Steps

- **[Choose Your Installation Method →](Installation)** - Learn about different approaches
- **[Explore Shader Systems →](Shader-Systems)** - See available shaders and presets
- **[Configuration Options →](Configuration)** - Customize behavior

## Need Help?

- Check **[Troubleshooting](Troubleshooting)** for common issues
- See **[FAQ](FAQ)** for frequently asked questions
- Open an issue on [GitHub](https://github.com/cael-prussian/morphbg/issues)
