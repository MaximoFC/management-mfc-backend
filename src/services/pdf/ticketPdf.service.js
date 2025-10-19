import PdfPrinter from "pdfmake";
import path from "path";

const fonts = {
    Roboto: {
        normal: path.join(process.cwd(), "fonts/Roboto-Regular.ttf"),
        bold: path.join(process.cwd(), "fonts/Roboto-Bold.ttf")
    },
};

const printer = new PdfPrinter(fonts);

export const generateTicket = async (data) => {
    const { client, services = [], total_ars = 0 } = data;

    const body = 
        services && services.length > 0
            ? services.map((s, i) => [
                { text: `${i + 1}. ${s.name}`, alignment: "left" }
            ])
            : [[{ text: "Sin servicios", alignment: "left", color: "gray" }]];

    const docDefinition = {
        pageSize: { width: 200, height: "auto" },
        pageMargins: [5, 5, 5, 5],
        content: [
            { text: "Ticket de servicios", alignment: "center", margin: [0, 0, 0, 5] },
            { text: `Cliente: ${client.name}`, margin: [0, 0, 0, 2] },
            { text: `Cel: ${client.mobileNum}\n\n` },
            {
                table: {
                    widths: ["*"],
                    body: body,
                },
                layout: "noBorders",
            },
            
            {
                table: {
                    widths: ["*"],
                    body: [[""]],
                },
                layout: {
                    hLineWidth: () => 0.5,
                    vLineWidth: () => 0,
                },
                margin: [0, 5, 0, 5]
            },

            {
                text: `TOTAL: $${total_ars.toLocaleString("es-AR")}`,
                style: "total",
                alignment: "right",
            },
        ],
        styles: {
            total: { fontSize: 10, bold: true },
            default: { fontSize: 7 }
        },
        defaultStyle: {
            fontSize: 7
        }
    };

    return new Promise((resolve, reject) => {
        const pdfDoc = printer.createPdfKitDocument(docDefinition);
        const chunks = [];
        pdfDoc.on("data", (chunk) => chunks.push(chunk));
        pdfDoc.on("end", () => {
            const pdfBuffer = Buffer.concat(chunks);
            resolve(pdfBuffer);
        });
        pdfDoc.on("error", reject);
        pdfDoc.end();
    });
};
