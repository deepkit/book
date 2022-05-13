
mkdir -p build;
asciidoctor -b docbook src/index.adoc -o build/index.xml
pandoc --from docbook --toc --to latex --output build/deepkit-book.pdf build/index.xml
