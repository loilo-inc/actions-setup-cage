dist/index.js: index.ts package.json yarn.lock
	yarn tsc
	yarn ncc build dist/index.js