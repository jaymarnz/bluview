/*
**  1. Inline external scripts, style sheets, and images
**  2. Minify index.html
**  3. Copy .png and .ico images
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
.then (async () => await copyimages())

async function copyimages() {
  return new Promise((resolve, reject) => {
    copy([ './src/*.png', './src/*.ico' ], './dist', (err, files) => {
      if (err) return reject(new Error(err))
      resolve()
    })
  })
}
