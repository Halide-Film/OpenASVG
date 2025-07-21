# OpenASVG: Open Animated Scalable Vector Graphics

OpenASVG (Open Animated Scalable Vector Graphics) is an open standard for creating and displaying high-performance animated vector graphics. Built as a declarative extension of the existing SVG standard, OpenASVG provides a modern, performance-focused approach to web animation.


## 🌟 Why OpenASVG?

The web needs a standardized, open format for vector animations that:



* **Performs well** across devices and platforms.
* **Integrates seamlessly** with existing SVG workflows.
* Remains **readable and hand-editable**.
* **Scales infinitely** without quality loss.
* **Compresses efficiently** for web delivery.

OpenASVG is designed to meet these critical requirements, offering a robust solution for animated content on the web.


## ✨ Key Features



* **Declarative Animation Model:** Define animations separately from graphics, leading to cleaner, more organized, and easily maintainable code.
* **Timeline-Based Control:** Gain precise control over timing and sequencing of complex animations with a dedicated timeline system.
* **Hardware Accelerated:** Optimized for GPU rendering, ensuring smooth, high-performance animations even on demanding scenes.
* **Fallback Support:** Gracefully degrades to static SVG, ensuring your content is always visible, even in environments without full OpenASVG support.
* **Open Source:** Free to use and implement, fostering a vibrant and collaborative ecosystem for vector animation.
* **Scalable & Efficient:** Leverages the inherent scalability of vector graphics and employs efficient compression techniques for optimal web delivery.
* **Advanced Capabilities:** Includes support for variables, expressions, responsive animations, state management for interactivity, particle systems, and various filters and effects.


## 🚀 Getting Started

To get started with OpenASVG, you can use the official JavaScript library, openasvg.js.


### Installation

Simply include the openasvg.js library in your HTML:

&lt;script src="path/to/openasvg.js">&lt;/script> \



### Basic Usage

Here's a quick example of how to embed and play an OpenASVG animation:

&lt;!DOCTYPE html> \
&lt;html lang="en"> \
&lt;head> \
    &lt;meta charset="UTF-8"> \
    &lt;meta name="viewport" content="width=device-width, initial-scale=1.0"> \
    &lt;title>OpenASVG Example&lt;/title> \
    &lt;style> \
        body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background-color: #f0f2f5; } \
        canvas { border: 1px solid #ccc; display: block; } \
    &lt;/style> \
&lt;/head> \
&lt;body> \
    &lt;canvas id="myAsvgCanvas">&lt;/canvas> \
 \
    &lt;!-- Include the OpenASVG library --> \
    &lt;script src="path/to/openasvg.js">&lt;/script> \
    &lt;script> \
        const asvgContent = `&lt;?xml version="1.0" encoding="UTF-8"?> \
&lt;asvg version="2025.7" xmlns="http://halide.org/openasvg/2025.7" \
      xmlns:svg="http://www.w3.org/2000/svg" \
      width="400" height="400" duration="2s" loop="true"> \
    &lt;timeline> \
        &lt;animate target="#circle" attribute="r" \
                 from="20" to="80" duration="1s" \
                 easing="ease-in-out" repeat="infinite" \
                 reverse="true" /> \
    &lt;/timeline> \
    &lt;svg:svg viewBox="0 0 400 400"> \
        &lt;svg:circle \
            id="circle" \
            cx="200" cy="200" r="20" \
            fill="#4a90e2" /> \
    &lt;/svg:svg> \
&lt;/asvg>`; \
 \
        const canvas = document.getElementById('myAsvgCanvas'); \
        canvas.width = 400; \
        canvas.height = 400; \
 \
        const asvgAnimation = new OpenASVG(asvgContent, { \
            autoplay: true, \
            loop: true \
        }); \
 \
        asvgAnimation.on('ready', () => { \
            asvgAnimation.render(canvas); \
        }); \
 \
        asvgAnimation.on('update', () => { \
            asvgAnimation.render(canvas); \
        }); \
 \
        // Optional: Handle canvas resizing \
        window.addEventListener('resize', () => { \
            canvas.width = canvas.offsetWidth; \
            canvas.height = canvas.offsetHeight; \
            asvgAnimation.render(canvas); \
        }); \
    &lt;/script> \
&lt;/body> \
&lt;/html> \



## 🌐 Including ASVGs in Webpages

OpenASVG content can be integrated into web pages using standard HTML elements or CSS properties.


### Using the &lt;object> Tag

The &lt;object> tag is a versatile way to embed external content, including ASVG files. It also allows for fallback content if the browser cannot display the ASVG.

&lt;object data="animation.asvg" type="image/asvg+xml"> \
    &lt;!-- Fallback content if ASVG is not supported --> \
    &lt;img src="fallback.svg" alt="Animation" /> \
&lt;/object> \




* The data attribute specifies the path to your ASVG file.
* The type attribute should be set to image/asvg+xml.
* Content inside the &lt;object> tags will be displayed if the ASVG cannot be rendered.


### Using CSS Background Images

You can also use ASVG files as background images in CSS.

.element { \
    background-image: url('animation.asvg'); \
    animation: asvg-play 2s infinite; /* Example CSS animation property */ \
    /* Other CSS properties */ \
} \




* This method is suitable for decorative animations that don't require direct interaction or manipulation via JavaScript.
* Note that the animation property here refers to standard CSS animations, which can be used in conjunction with ASVG backgrounds.


## 🛠️ Tools



* **ASVG Viewer:** A reference implementation for viewing .asvg files.


## 📄 Documentation

For a comprehensive understanding of the OpenASVG standard, its API, and advanced features, please refer to the [official documentation](https://www.google.com/search?q=http://halidefilms.net/openasvg/documentation).


## ⚖️ License

OpenASVG is licensed under the GNU GPL 2.0 License.

*Copyright © 2025 Halide Systems Ltd. All rights reserved.*
