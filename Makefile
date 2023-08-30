.PHONY: build ebook web-build ebook-build all

ebook-build:
	./node_modules/.bin/sass ui-bundle/css/style.scss > ui-bundle/css/style.css

ebook: ebook-build
	DIST_BUILD=1 ./node_modules/.bin/ts-node scripts/build.ts german
	DIST_BUILD=1 ./node_modules/.bin/ts-node scripts/build.ts english
	DIST_BUILD=1 ./node_modules/.bin/ts-node scripts/build.ts chinese

web-build: ebook-build
	./node_modules/.bin/sass src/assets/style.scss > src/assets/style.css

web: web-build
    ./node_modules/.bin/tsc
	./node_modules/.bin/antora --stacktrace playbook.yml

all:
	make web
	make ebook
