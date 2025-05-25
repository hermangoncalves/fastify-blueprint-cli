generate:
	@rm -rf api && rm -rf ./dist && pnpm run build && node ./dist/cli.js generate	