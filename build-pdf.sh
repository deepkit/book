
mkdir -p build;

echo Build Docbook
asciidoctor -b docbook5 src/index.adoc -o build/index.xml

echo Build PDF
pandoc --from docbook --toc --to latex --resource-path src/ --output build/deepkit-book.pdf build/index.xml
