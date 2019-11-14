dist/index.js: index.ts
	yarn tsc
	yarn ncc build dist/index.js