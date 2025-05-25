# fastify-blueprint-cli

A powerful CLI tool to scaffold Fastify applications with TypeScript support and modern development features.

## Features

- 🚀 **Fastify + TypeScript** setup out of the box
- 🔌 **Plugin Selection**:
  - Swagger/OpenAPI documentation
  - JWT Authentication
  - CORS
  - Rate Limiting
  - And more...
- 🗄️ **Database Integration**:
  - Prisma ORM support
  - Drizzle ORM support
- 🐳 **Docker Support**:
  - Dockerfile
  - docker-compose.yml
  - Development-ready configuration
- 📝 **Modern Development**:
  - TypeScript configuration
  - Hot reload setup
  - Prettier formatting
  - Pino logging

## Prerequisites

- Node.js 18+
- PNPM

## Installation

```bash
# Install globally
npm install -g fastify-blueprint-cli

# Or use directly with npx
npx fastify-blueprint-cli
```

## Usage

```bash
# Generate a new project
fastify-blueprint generate

# Or with npx
npx fastify-blueprint-cli generate
```

### Command Options

```bash
Options:
  --name <name>     Project name
  --orm <orm>       ORM to use (prisma, drizzle, none)
  --author <name>   Author name
  -h, --help       Display help for command
```

### Interactive Prompts

The CLI will guide you through the following options:

1. **Project Name**: Name of your project
2. **Author**: Your name or organization
3. **Description**: Short description of your project
4. **Plugins**: Choose from available Fastify plugins
   - @fastify/swagger
   - @fastify/swagger-ui
   - @fastify/jwt
   - @fastify/cors
   - @fastify/rate-limit
5. **ORM Selection**: Choose your database ORM
   - Prisma
   - Drizzle
   - None
6. **Docker Support**: Option to include Docker configuration

## Project Structure

The generated project will have the following structure:

```
your-project/
├── src/
│   ├── plugins/      # Fastify plugins
│   ├── routes/       # API routes
│   └── server.ts     # Server configuration
├── .env             # Environment variables
├── .env.example     # Environment variables example
├── package.json     # Project dependencies
├── tsconfig.json    # TypeScript configuration
└── README.md        # Project documentation
```

Additional files based on selected options:

```
# If Prisma is selected:
├── prisma/
│   └── schema.prisma    # Prisma schema

# If Drizzle is selected:
├── src/
│   └── schema.ts        # Drizzle schema
└── drizzle.config.ts    # Drizzle configuration

# If Docker is selected:
├── Dockerfile           # Docker configuration
├── docker-compose.yml   # Docker Compose configuration
└── .dockerignore        # Docker ignore file
```

## Development

To contribute to this project:

```bash
# Clone the repository
git clone https://github.com/yourusername/fastify-blueprint-cli.git

# Install dependencies
pnpm install

# Build the project
pnpm build

# Run locally
pnpm start
```

## License

MIT

## Author

Herman Gonçalves
