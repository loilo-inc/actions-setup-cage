dist/index.js: index.ts
	yarn tsc
	yarn ncc build dist/index.js
test:
	docker run \
		-v `pwd`:/src \
		-w /src \
		-t node:12.13 \
		yarn test
