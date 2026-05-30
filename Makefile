.PHONY: dev build start lint clean migrate studio deploy vercel-deploy typecheck prisma-gen icons

# Development
dev:
	npm run dev

# Build for production
build: prisma-gen
	npm run build

# Start production server
start:
	npm run start

# Lint
lint:
	npm run lint

# TypeScript type check
typecheck:
	npx tsc --noEmit --skipLibCheck

# Clean build artifacts
clean:
	rm -rf .next/ out/ dist/
	@echo "Cleaned build artifacts"

# Prisma commands
prisma-gen:
	npx prisma generate

migrate:
	npx prisma migrate dev

studio:
	npx prisma studio

# Vercel deploy
vercel-deploy:
	npm run vercel-deploy

# PWA icons regeneration
icons:
	npx sharp-cli public/icons/icon-192x192.svg -o public/icons/icon-192x192.png 192 192
	npx sharp-cli public/icons/icon-512x512.svg -o public/icons/icon-512x512.png 512 512

# Marketing engine (dry run)
marketing-dry:
	python3 marketing-output/marketing-engine.py --dry-run

# Full setup
setup: prisma-gen
	@echo "✓ Setup complete"
