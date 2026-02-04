lib/index.js: src/*.ts package.json package-lock.json tsconfig.json
	npx ncc build src/index.ts -o lib
