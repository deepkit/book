.PHONY: build ebook web-build ebook-build all

ebook-build:
	./node_modules/.bin/sass ui-bundle/css/style.scss > ui-bundle/css/style.css
	./node_modules/.bin/tsc --project tsconfig.json

ebook: ebook-build
	node scripts/build.js german
	node scripts/build.js english

web-build: ebook-build
	./node_modules/.bin/sass src/assets/style.scss > src/assets/style.css

web: web-build
	./node_modules/.bin/antora playbook.yml

all:
	make web
	make ebook
