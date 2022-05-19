#!/usr/bin/env ./node_modules/.bin/ts-node-script
import asciidoctor, { Asciidoctor } from "asciidoctor";
import { readFileSync, writeFileSync, existsSync, cpSync } from 'fs';
import { isAbsolute, join } from 'path';
import fetch from 'node-fetch';
import { spawn } from 'child_process';


import docbookConverter from '@asciidoctor/docbook-converter';
import ProcessorOptions = Asciidoctor.ProcessorOptions;

const asciidoc = asciidoctor();
docbookConverter.register();

// import * as glob from 'glob';
// const files = glob.sync('src/**/*.adoc');
// console.log(files);
//

const targetLanguage: string = process.argv[2];
const languageMap: { [lang: string]: string } = {
    german: 'DE',
    english: 'EN',
    chinese: 'ZH',
}

if (!languageMap[targetLanguage]) throw new Error(`Language ${languageMap} not supported`);
const targetLanguageShort = languageMap[targetLanguage].toLowerCase();

const translationCachePath = './translations.json';
let allTranslations: { [language: string]: { [text: string]: string } } = {};

if (existsSync(translationCachePath)) {
    const json = readFileSync(translationCachePath).toString('utf8');
    allTranslations = json ? JSON.parse(json) : {};
}
let translations = allTranslations[targetLanguage];
if (!translations) translations = allTranslations[targetLanguage] = {};

const textQueue: string[] = [];

function ensureTranslation(sourceText: string): void {
    if (translations[sourceText]) return;

    textQueue.push(sourceText);
}

async function loadTranslations(): Promise<void> {
    let translations = allTranslations[targetLanguage];
    if (!translations) translations = allTranslations[targetLanguage] = {};

    // textQueue.length = 5;

    console.log('load translations for', textQueue);
    const params = new URLSearchParams();
    const map: { [text: string]: { index: number } } = {};
    let index = 0;
    for (const text of textQueue) {
        map[text] = { index: index };
        params.append('text', text);
        index++;
    }
    params.append('auth_key', process.env.DEEPL_KEY);
    params.append('source_lang', 'DE');
    params.append('target_lang', languageMap[targetLanguage].toUpperCase());

    const response = await fetch('https://api.deepl.com/v2/translate', {
        method: 'post',
        body: params
    });

    if (!response.ok) {
        throw new Error(`HTTP deepl error: ${response.status} ${response.statusText}: ${await response.text()}`);
    }

    const result = await response.json();

    if (result && result.translations && result.translations) {
        for (const [text, info] of Object.entries(map)) {
            const translated = result.translations[info.index];
            if (!translated) throw new Error(`No translation found at index ${info.index}`);
            translations[text] = translated.text;
        }
    }

    // console.log('textAll', textAll);
    // console.log('translated', translated);
    // console.log('translations', translations);

    writeFileSync(translationCachePath, JSON.stringify(allTranslations, undefined, 4));
}

function heading(text: string): string {
    return text.replace(/(^\w{1})|(\s+\w{1})/g, letter => letter.toUpperCase());
}

function isListItem(doc: any): doc is { text: string } {
    return doc.context === 'list_item' && 'string' === typeof doc.text;
}

function extractOrApplyTranslations() {
    this.process(function process(this: Asciidoctor.Extensions.TreeProcessor, doc: Asciidoctor.AbstractBlock, depth: number = 0) {
        const context: string = (doc as any).context;

        if (targetLanguage !== 'german') {
            // console.log(' '.repeat(4 * depth), context);

            if (isListItem(doc)) {
                if (translations[doc.text]) {
                    doc.text = translations[doc.text];
                } else {
                    ensureTranslation(doc.text);
                }
            }

            if (context === 'section') {
                const title = doc.getTitle();
                doc.setTitle(title);
                const keep = doc.getAttribute('keep');
                if (!keep && keep !== '*' && keep !== targetLanguage) {
                    if (translations[title]) {
                        doc.setTitle(heading(translations[title]));
                    } else {
                        ensureTranslation(title);
                    }
                }
            }

            if (context === 'paragraph') {
                const lines = (doc as any).lines as string[] | undefined;
                if (!lines) return doc;

                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    if (translations[line]) {
                        lines[i] = translations[line];
                    } else {
                        ensureTranslation(line);
                    }
                }
                this.createBlock(doc, 'paragraph', lines, doc.getAttributes());
            }
        }

        const blocks = doc.getBlocks();
        const copy = blocks.slice();
        blocks.length = 0;
        outer:
            for (let i = 0; i < copy.length; i++) {
                const attr = copy[i].getAttributes();
                if (attr.lang) {
                    if (attr.lang === targetLanguage) {
                        blocks.push(copy[i]);
                    } else {
                        console.log('ignore block', attr.lang, targetLanguage);
                    }
                    continue;
                } else {
                    //look for translated blocks underneath
                    for (let j = i + 1; j < copy.length; j++) {
                        const attr = copy[j].getAttributes();
                        if (!attr.lang) {
                            //none found or end
                            break;
                        } else {
                            if (attr.lang === targetLanguage) {
                                //translation found for this block. ignore the origin (copy[i}]
                                //by jumping over
                                continue outer;
                            }
                        }
                    }
                }
                blocks.push(process.call(this, copy[i], depth + 1));
            }
        return doc;
    });
}

function macroPageBreak(this: Asciidoctor.Extensions.InlineMacroProcessorDsl) {
    this.process(function (parent, target) {
        console.log('pageBreak!');
        return this.createInline(parent, 'quoted', 'PageBreak', { 'type': 'strong' }).convert();
    })
}

async function main() {
    const registry = asciidoc.Extensions.create();
    registry.treeProcessor(extractOrApplyTranslations);
    // registry.includeProcessor(inlineHook);
    registry.inlineMacro('pageBreak', macroPageBreak);

    const options: ProcessorOptions = {
        extension_registry: registry,
        to_dir: 'build',
        doctype: 'book',
        safe: 'server',
        // backend: 'docbook5',
        standalone: true,
        attributes: {
            // 'allow-uri-read': true,
            'data-uri': true,
            linkcss: true,
            stylesdir: '../src/assets/',
            stylesheet: 'style.css',
            // stylesheet: '../node_modules/latex.css/style.css'
        }
    }

    //load to extract all texts to translate
    let doc = asciidoc.loadFile('src/index.adoc', options);
    // console.log('textQueue', textQueue);

    //if new texts to translate is found, load them, and loadFile again so that
    //extractOrApplyTranslations applies all found translations
    if (textQueue.length && process.env.DEEPL_KEY) {
        console.log('Load translations ...')
        await loadTranslations();
        console.log('Rebuild document ...');
        doc = asciidoc.loadFile('src/index.adoc', options);
    }

    const outputPath = 'build/deepkit-book-' + targetLanguage + '.html';

    let result: string = doc.convert();

    if (process.env.DIST_BUILD) {
        result = result.replace(/..\/src\/assets/g, 'assets');
        cpSync('src/assets', 'build/assets', { recursive: true });
    }

    writeFileSync(outputPath, result);
    // console.log('Build PDF');
    // const pdfPath = 'build/deepkit-book-' + targetLanguage + '.pdf';
    // spawn('pandoc', ['--from', 'docbook', '--toc', '--to', 'latex', '--resource-path', 'src/', '--output', pdfPath, outputPath], { stdio: 'inherit' });
}

main();
