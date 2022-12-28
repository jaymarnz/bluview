/*
**  1. Inline external scripts
**  2. Inline stylesheets
**  3. Minify index.html
**  4. Copy .png and .ico images
*/
const fs = require('fs-extra')
const path = require('path');
const copy = require('copy')
const minify = require('html-minifier').minify;

const minifyOptions = {
  collapseWhitespace: true,
  minifyCSS: true,
  minifyJS: true,
  removeAttributeQuotes: true,
  removeComments: true
}

fs.ensureDirSync('./dist', { recursive: true })

inlineScriptTags({ fileName: './src/index.html' })
.then (async htmlString => {
  inlineStylesheets({ fileName: './src/index.html', htmlString })
  .then (async htmlString => {
    fs.writeFile('./dist/index.html', minify(htmlString, minifyOptions))
    .then (async () => {
      await copyimages()
    })
  })
})

async function copyimages() {
  return new Promise((resolve, reject) => {
    copy([ './src/*.png', './src/*.ico' ], './dist', (err, files) => {
      if (err) return reject(new Error(err))
      resolve()
    })
  })
}

// A shame the "inline-scripts" package for these requires a file name and you can't provide the html input as a string
// This means to chain them you have to create a temp file. Messy. So, I've made them chainable by taking either
// a fileName or an htmlString. Very small change.
//
// MIT License
// Copyright (c) 2020 mahhov
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
async function inlineStylesheets(options) {
  let fileName, htmlString;
  if (typeof options === 'string') fileName = options;
  if (typeof options === 'object') ({ fileName, htmlString } = options);
	const html = htmlString || await fs.readFile(fileName, 'utf8');

	const linkTagRegex = /<link (?:.* )?rel="stylesheet"(?:.* )?href="([\w.\-\/]+)".*>|<link (?:.* )?href="([\w.\-\/]+)"(?:.* )?rel="stylesheet".*>/;
	let matches = html.match(new RegExp(linkTagRegex, 'g'));
	if (!matches)
		return html;
	let stylesheetPromises = matches
		.map(linkTag => {
			let m = linkTag.match(linkTagRegex);
			return m[1] || m[2];
		})
		.map(relPath => path.resolve(path.dirname(fileName), relPath))
		.map(stylesheetPath => fs.readFile(stylesheetPath, 'utf8'));
	let i = 0;
	return Promise.all(stylesheetPromises).then(stylesheets =>
		html.replace(new RegExp(linkTagRegex, 'g'), () =>
			`<style>${stylesheets[i++]}</style>`));
}

async function inlineScriptTags(options) {
  let fileName, htmlString;
  if (typeof options === 'string') fileName = options;
  if (typeof options === 'object') ({ fileName, htmlString } = options);
	const html = htmlString || await fs.readFile(fileName, 'utf8');

	const scriptTagRegex = /<script (?:.* )?src="([\w.\-\/]+)".*><\/script>/;
	let matches = html.match(new RegExp(scriptTagRegex, 'g'));
	if (!matches)
		return html;
	let scriptPromises = matches
		.map(scriptTag => scriptTag.match(scriptTagRegex)[1])
		.map(relScriptPath => path.resolve(path.dirname(fileName), relScriptPath))
		.map(scriptPath => fs.readFile(scriptPath, 'utf8'));
	let i = 0;
	return Promise.all(scriptPromises).then(scripts =>
		html.replace(new RegExp(scriptTagRegex, 'g'), () =>
			`<script>${scripts[i++].replace(/<\/script>/g, '<\\/script>')}</script>`));
}
