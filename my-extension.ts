// const {Translation, extractOrApplyTranslations} = require("./scripts/utils");
const Asciidoctor = require('@asciidoctor/core')();

// import asciidoctor, { Asciidoctor } from "asciidoctor";
import { extractOrApplyTranslations, macroPageBreak, Translation } from "./scripts/utils";
// const asciidoc = asciidoctor();

module.exports.register = function ({ config }) {
    const translation = new Translation();
    const registry = Asciidoctor.Extensions.create();
    registry.treeProcessor(function () {
        extractOrApplyTranslations.call(this, translation);
    });

    const asciiLoad = Asciidoctor.load;
    Asciidoctor.load = function (...args) {
        args[1].extension_registry.treeProcessor(function () {
            extractOrApplyTranslations.call(this, translation);
        })
        translation.setLanguage(args[1].attributes['page-component-name']);
        const document = asciiLoad.call(this, ...args);
        // console.log('YOLO', document.reader?.file, args[1].attributes['page-component-name']);
        // console.log('YOLO', document);
        return document;
    }

    this.on('contentClassified', async (event) => {
        const { playbook, contentCatalog } = this.getVariables()
        const options = {
            extension_registry: registry,
            safe: 'server',
            base_dir: 'src/modules/ROOT/pages'
        };

        // console.log('lang', this.getVariables());
        // console.log('contentCatalog', contentCatalog.getComponents());
        // translation.setLanguage(args[1].attributes.lang);

        const components: {[name: string]: true} = {};
        for (const page of contentCatalog.getPages()) {
            components[page.src.component] = true;
        }

        for (const component of Object.keys(components)) {
            console.log('Load component', component);
            translation.setLanguage(component);

            for (const page of contentCatalog.getPages()) {
                if (page.src.component !== component) continue;

                const content = page.contents.toString('utf8');
                //trigger Translation extension to extract language
                asciiLoad.call(Asciidoctor, content, options);
            }
            console.log('Load languages for', component);
            await translation.loadTranslations();
        }
    });

    // this.on('beforePublish', (event) => {
    //     const { playbook, contentCatalog, siteCatalog } = this.getVariables()
    //     console.log('siteCatalog', contentCatalog.getPages()[0].contents.toString('utf8'));
    //     // console.log('contentCatalog', contentCatalog.getComponents()[0]);
    //     // console.log('pagesComposed', this.getVariables());
    //     // console.log('pagesComposed', contentCatalog[Object.getOwnPropertySymbols(contentCatalog)[0]].get('default'));
    // })
}
