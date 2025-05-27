build:
	pnpm run build

generate:
	rm -rf api/ && node ./dist/cli.js generate

build-generate: build generate