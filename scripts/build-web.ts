#!/usr/bin/env ./node_modules/.bin/ts-node-script
import asciidoctor, { Asciidoctor } from "asciidoctor";
import { cpSync, writeFileSync } from 'fs';

import docbookConverter from '@asciidoctor/docbook-converter';
import { extractOrApplyTranslations, macroPageBreak, Translation } from "./utils";
import ProcessorOptions = Asciidoctor.ProcessorOptions;

const asciidoc = asciidoctor();
docbookConverter.register();

async function main() {
    const translation = new Translation(process.argv[2]);
    const registry = asciidoc.Extensions.create();
    registry.treeProcessor(function () {
        extractOrApplyTranslations.call(this, translation);
    });
    // registry.includeProcessor(inlineHook);
    registry.inlineMacro('pageBreak', macroPageBreak);

    const options: ProcessorOptions = {
        extension_registry: registry,
        to_dir: 'build',
        doctype: 'book',
        safe: 'server',
        // backend: 'docbook5',
        // standalone: true,
        attributes: {
            // 'allow-uri-read': true,
            'data-uri': true,
            linkcss: true,
            stylesdir: '../src/assets/',
            stylesheet: 'style.css',
            // stylesheet: '../node_modules/latex.css/style.css'
        }
    };

    asciidoc.convertFile('src/validation.adoc', options);
    asciidoc.convertFile('src/web.adoc', options);

    // //load to extract all texts to translate
    // let doc = asciidoc.loadFile('src/index.adoc', options);
    // // console.log('textQueue', textQueue);
    //
    // //if new texts to translate is found, load them, and loadFile again so that
    // //extractOrApplyTranslations applies all found translations
    // if (translation.textQueue.length && process.env.DEEPL_KEY) {
    //     console.log('Load translations ...')
    //     await translation.loadTranslations();
    //     console.log('Rebuild document ...');
    //     doc = asciidoc.loadFile('src/index.adoc', options);
    // }
    //
    // const outputPath = 'build/deepkit-book-' + translation.targetLanguage + '.html';
    //
    // let result: string = doc.convert();
    //
    // if (process.env.DIST_BUILD) {
    //     result = result.replace(/..\/src\/assets/g, 'assets');
    //     cpSync('src/assets', 'build/assets', { recursive: true });
    // }
    //
    // writeFileSync(outputPath, result);
    // // console.log('Build PDF');
    // // const pdfPath = 'build/deepkit-book-' + targetLanguage + '.pdf';
    // // spawn('pandoc', ['--from', 'docbook', '--toc', '--to', 'latex', '--resource-path', 'src/', '--output', pdfPath, outputPath], { stdio: 'inherit' });
}

main();
