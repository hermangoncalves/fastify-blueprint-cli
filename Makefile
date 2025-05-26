build:
	rm -rf ./dist && rm -rf api/ && pnpm run build

generate:
	node ./dist/cli.js generate

build-generate: build generate