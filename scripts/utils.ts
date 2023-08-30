import { existsSync, readFileSync, writeFileSync } from "fs";
import { Asciidoctor } from "asciidoctor";
import fetch from 'node-fetch';

const languageMap: { [lang: string]: string } = {
    german: 'DE',
    english: 'EN',
    chinese: 'ZH',
    polish: 'PL',
}

export class Translation {
    translations: { [name: string]: string } = {};
    allTranslations: { [language: string]: { [text: string]: string } } = {};
    textQueue: string[] = [];
    translationCachePath = './translations.json';

    fileLoaded: boolean = false;

    constructor(public targetLanguage?: string) {
        if (targetLanguage) {
            this.targetLanguage = '';
            this.setLanguage(targetLanguage);
        }
    }

    setLanguage(targetLanguage: string) {
        if (!targetLanguage) return;
        if (this.targetLanguage === targetLanguage) return;

        this.targetLanguage = targetLanguage;
        console.log('setLanguage', this.targetLanguage);

        if (!this.targetLanguage) this.targetLanguage = 'german';

        if (!languageMap[this.targetLanguage]) throw new Error(`Language ${this.targetLanguage} not supported`);
        // const targetLanguageShort = languageMap[targetLanguage].toLowerCase();

        if (!this.fileLoaded && existsSync(this.translationCachePath)) {
            const json = readFileSync(this.translationCachePath).toString('utf8');
            this.allTranslations = json ? JSON.parse(json) : {};
            this.fileLoaded = true;
        }

        let translations = this.allTranslations[this.targetLanguage];
        if (!translations) translations = this.allTranslations[this.targetLanguage] = {};
        this.translations = translations;
    }

    ensureTranslation(sourceText: string): void {
        if (this.translations[sourceText]) return;

        this.textQueue.push(sourceText);
    }

    async loadTranslations(): Promise<void> {
        if (!this.textQueue.length || !process.env.DEEPL_KEY) {
            console.log('this.textQueue', this.textQueue.length);
            console.log('Load translation failed since either textQueue empty or DEEPL_KEY missing');
            return;
        }

        console.log('Load translations ...');
        let translations = this.allTranslations[this.targetLanguage];
        if (!translations) translations = this.allTranslations[this.targetLanguage] = {};

        // textQueue.length = 5;

        if (this.textQueue.length>500) {
            this.textQueue.length = 500;
            console.log('!!! Translation truncated to 500 items. Rerun to get more.');
        }
        console.log('load translations for', this.textQueue.length);
        const params = new URLSearchParams();
        const map: { [text: string]: { index: number } } = {};
        let index = 0;
        for (const text of this.textQueue) {
            map[text] = { index: index };
            params.append('text', text);
            index++;
        }
        params.append('auth_key', process.env.DEEPL_KEY);
        params.append('source_lang', 'EN');
        params.append('target_lang', languageMap[this.targetLanguage].toUpperCase());

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

        writeFileSync(this.translationCachePath, JSON.stringify(this.allTranslations, undefined, 4));
    }

    get(text: string): string {
        return this.translations[text] || text;
    }

    heading(text: string): string {
        return text.replace(/(^\w{1})|(\s+\w{1})/g, letter => letter.toUpperCase());
    }

    isListItem(doc: any): doc is { text: string } {
        return doc.context === 'list_item' && 'string' === typeof doc.text;
    }
}

export function extractOrApplyTranslations(translation: Translation) {
    this.process(function process(this: Asciidoctor.Extensions.TreeProcessor, doc: Asciidoctor.AbstractBlock, depth: number = 0) {
        const context: string = (doc as any).context;

        if (translation.targetLanguage !== 'english') {
            // console.log(' '.repeat(4 * depth), context);

            if (translation.isListItem(doc)) {
                if (translation.translations[doc.text]) {
                    doc.text = translation.translations[doc.text];
                } else {
                    translation.ensureTranslation(doc.text);
                }
            }

            if (context === 'section') {
                const title = doc.getTitle();
                doc.setTitle(title);
                const keep = doc.getAttribute('keep');
                if (!keep && keep !== '*' && keep !== translation.targetLanguage) {
                    if (translation.translations[title]) {
                        doc.setTitle(translation.heading(translation.translations[title]));
                    } else {
                        translation.ensureTranslation(title);
                    }
                }
            }

            if (context === 'paragraph') {
                const lines = (doc as any).lines as string[] | undefined;
                if (!lines) return doc;

                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    if (translation.translations[line]) {
                        lines[i] = translation.translations[line];
                    } else {
                        translation.ensureTranslation(line);
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
                    if (attr.lang === translation.targetLanguage) {
                        blocks.push(copy[i]);
                    } else {
                        console.log('ignore block', attr.lang, 'since target is', translation.targetLanguage);
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
                            if (attr.lang === translation.targetLanguage) {
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

export function macroPageBreak(this: Asciidoctor.Extensions.InlineMacroProcessorDsl) {
    this.process(function (parent, target) {
        console.log('pageBreak!');
        return this.createInline(parent, 'quoted', 'PageBreak', { 'type': 'strong' }).convert();
    })
}
