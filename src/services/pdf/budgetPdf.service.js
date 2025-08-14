import PdfPrinter from "pdfmake";
import path from "path";
import fs from "fs";

export const generateBudgetPdf = async (budgetData) => {
    const fonts = {
        Roboto: {
            normal: path.join(process.cwd(), 'fonts/Roboto-Regular.ttf'),
            bold: path.join(process.cwd(), 'fonts/Roboto-Bold.ttf'),
            italics: path.join(process.cwd(), 'fonts/Roboto-Italic.ttf'),
            bolditalics: path.join(process.cwd(), 'fonts/Roboto-BoldItalic.ttf')
        }
    };

    const printer = new PdfPrinter(fonts);

    const logoPath = path.join(process.cwd(), 'src', 'assets', 'logo.jpg');
    const logoBase64 = fs.readFileSync(logoPath).toString('base64');

    const docDefinition = {
        content: [
            {
                columns: [
                    {
                        image: `data:image/jpeg;base64,${logoBase64}`,
                        width: 70
                    },
                    {
                        width: '*',
                        alignment: 'right',
                        margin: [0, 0, 0, 10],
                        stack: [
                            { text: budgetData.name, style: 'boldText' },
                            { text: budgetData.address, style: 'info' },
                            { text: `Tel: ${budgetData.mobileNum}`, style: 'info' }
                        ]
                    }
                ]
            },
            {
                columns: [
                    { text: `Presupuesto del día ${new Date().toLocaleDateString()}`, style: 'boldText', alignment: 'left' },
                ],
                margin: [0, 10, 0, 10]
            },
            {
                table: {
                    widths: ['*', 'auto', 'auto'],
                    body: [
                        ['Repuesto', 'Cantidad', 'Precio'],
                        ...budgetData.items.map(item => [
                            item.name,
                            item.qty,
                            `$${item.price.toFixed(2)}`
                        ]),
                        [
                            { text: 'TOTAL', colSpan: 2, alignment: 'right', bold: true },
                            {},
                            { text: `$${budgetData.total.toFixed(2)}`, bold: true }
                        ]
                    ]
                }
            }
        ],
        styles: {
            header: { fontSize: 18, bold: true },
            boldText: { fontSize: 12, bold: true },
            info: { fontSize: 10 }
        }
    };
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    const chunks = [];

    return new Promise((resolve, reject) => {
        pdfDoc.on('data', chunk => chunks.push(chunk));
        pdfDoc.on('end', () => {
            const result = Buffer.concat(chunks);
            resolve(result);
        });
        pdfDoc.end();
    });
};