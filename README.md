# BSML Renderer

BSML (Balance Sheet Modeling Language) parser and renderer.

## Agents

Shout DRY!YAGNI!KISS! and read AGENTS.md for more info.

## Getting Started

This project uses [Bun](https://bun.sh) for fast package management, building, and testing.

### Installation

To install dependencies:

```bash
bun install
```

### Development

To format, build, or test the project, use the following commands:

```bash
# Run tests
bun test

# Run tests in watch mode
bun run test:watch

# Build the project (TypeScript compilation)
bun run build
```

## Structure

- `src/`: Contains the lexer and parser logic based on Chevrotain.
- `tests/`: Contains test fixtures and execution specs.
- `docs/`: BSML specifications and documentation.
