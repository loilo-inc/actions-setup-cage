lib/index.js: index.ts package.json package-lock.json tsconfig.json
	npx ncc build index.ts -o lib
