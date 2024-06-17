lib/index.js: index.ts src/setup.ts package.json package-lock.json
	npx ncc build index.ts -o lib
