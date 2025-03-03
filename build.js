/*
**  1. Inline external scripts, style sheets, and images
**  2. Minify index.html
**  3. Copy webmanifest, service worker and images
*/
const fs = require('fs-extra')
const {inlineScriptTags, inlineStylesheets, inlineImages} = require('inline-scripts');
const minify = require('html-minifier').minify;
const copy = require('copy')

const minifyOptions = {
  collapseWhitespace: true,
  minifyCSS: true,
  minifyJS: true,
  removeAttributeQuotes: true,
  removeComments: true
}

fs.ensureDirSync('./dist', { recursive: true })

inlineScriptTags('./src/index.html')
.then (htmlString => inlineStylesheets({ htmlPath: './src/index.html', htmlString }))
.then (htmlString => inlineImages({ htmlPath: './src/index.html', htmlString }))
.then (htmlString => fs.writeFile('./dist/index.html', minify(htmlString, minifyOptions)))
.then (copyFiles())

async function copyFiles() {
  return new Promise((resolve, reject) => {
    copy([ './src/sw.js', './src/*.webmanifest', './src/*.png', './src/*.ico' ], './dist', (err, files) => {
      if (err) return reject(new Error(err))
      resolve()
    })
  })
}
