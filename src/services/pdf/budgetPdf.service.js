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
    
    const logoBase64 = "";
    if (fs.existsSync(logoPath)) {
        logoBase64 = fs.readFileSync(logoPath, { encoding: "base64" });
    }

    const items = Array.isArray(budgetData.items) ? budgetData.items : [];

    // --- Preparar filas de servicios y repuestos ---
    const serviceRows = items
        .filter(i => i.name?.toLowerCase().includes('service'))
        .map(s => [
            s.name,
            `$${s.price.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`
        ]);

    const partRows = items
        .filter(i => !i.name?.toLowerCase().includes('service'))
        .map(p => [
            p.name,
            p.qty,
            `$${(p.price * p.qty).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`
        ]);

    const docDefinition = {
        content: [
            {
                columns: [
                    { image: `data:image/jpeg;base64,${logoBase64}`, width: 70 },
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
            { columns: [{ text: `Presupuesto del día ${new Date().toLocaleDateString()}`, style: 'boldText', alignment: 'left' }], margin: [0, 10, 0, 10] },

            // --- Sección Servicios ---
            { text: 'Servicios', style: 'sectionHeader', margin: [0, 10, 0, 5] },
            {
                table: {
                    widths: ['*', 'auto'],
                    body: [['Servicio', 'Precio'], ...(serviceRows.length ? serviceRows : [['No hay servicios', '']])]
                }
            },

            // --- Sección Repuestos ---
            { text: 'Repuestos', style: 'sectionHeader', margin: [0, 15, 0, 5] },
            {
                table: {
                    widths: ['*', 'auto', 'auto'],
                    body: [['Repuesto', 'Cantidad', 'Precio'], ...(partRows.length ? partRows : [['No hay repuestos', '', '']])]
                }
            },

            // --- Total ---
            {
                table: {
                    widths: ['*', 'auto'],
                    body: [[{ text: 'TOTAL', alignment: 'right', bold: true }, { text: `$${budgetData.total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`, bold: true }]]
                },
                margin: [0, 15, 0, 0]
            }
        ],
        styles: {
            header: { fontSize: 18, bold: true },
            boldText: { fontSize: 12, bold: true },
            info: { fontSize: 10 },
            sectionHeader: { fontSize: 12, bold: true, decoration: 'underline' }
        }
    };

    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    const chunks = [];

    return new Promise((resolve, reject) => {
        pdfDoc.on("data", (chunk) => chunks.push(chunk));
        pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
        pdfDoc.on("error", reject);
        pdfDoc.end();
    });
};
