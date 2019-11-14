dist/index.js: index.ts
	yarn tsc
	yarn ncc build lib/index.js