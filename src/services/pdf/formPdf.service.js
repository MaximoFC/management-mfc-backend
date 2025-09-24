import PdfPrinter from "pdfmake";
import path from "path";
import fs from "fs";

export const generateFormPdf = async (formData) => {
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
    const logoBase64 = fs.readFileSync(logoPath).toString("base64");

    const docDefinition = {
        content: [
            // --- Encabezado con logo y taller ---
            {
                columns: [
                    { image: `data:image/jpeg;base64,${logoBase64}`, width: 90 },
                    {
                        width: "*",
                        alignment: "right",
                        stack: [
                            { text: formData.workshop?.name, style: "header" },
                            { text: formData.workshop?.address, style: "info" },
                            { text: `Tel: ${formData.workshop?.mobileNum}`, style: "info" }
                        ]
                    }
                ]
            },

            // --- Datos generales (orden, fecha, recibido) ---
            {
                table: {
                    widths: ["*", "*"],
                    body: [
                        [
                            { text: `Fecha de recepción: ${formData.date || "________"}`, style: "smallBox" },
                            { text: "Recibió: __________", style: "smallBox" }
                        ]
                    ]
                },
                margin: [0, 10, 0, 15]
            },

            // --- Datos del cliente ---
            { text: "Datos del Cliente", style: "sectionHeader", margin: [0, 0, 0, 5] },
            {
                table: {
                    widths: ["*", "*"],
                    body: [
                        [
                            { text: `Nombre: ${formData.client?.name || "________"}`, style: "infoBox" },
                            { text: `Celular: ${formData.client?.mobileNum || "________"}`, style: "infoBox" }
                        ]
                    ]
                },
                margin: [0, 0, 0, 10]
            },

            // --- Datos de la bicicleta ---
            { text: "Datos de la Bicicleta", style: "sectionHeader", margin: [0, 10, 0, 5] },
            {
                table: {
                    widths: ["*", "*"],
                    body: [
                        [
                            { text: `Marca: ${formData.bike?.brand || "-"}`, style: "infoBox" },
                            { text: `Modelo: ${formData.bike?.model || "-"}`, style: "infoBox" },
                        ]
                    ]
                },
                margin: [0, 0, 0, 15]
            },

            // --- Sección con campos rellenables ---
{
    columns: [
        {
            width: "65%",
            stack: [
                { text: "Provincia: _______________________", margin: [0, 0, 0, 5] },
                { text: "Ciudad: _________________________   Código postal: __________", margin: [0, 0, 0, 5] },
                { text: "Peso: _______   Tipo de uso: __________", margin: [0, 0, 0, 5] },
                { text: "Frecuencia: __________   Tiempo sin servicio: __________", margin: [0, 0, 0, 5] },
                {
                    columns: [
                        [
                            { canvas: [{ type: 'rect', x: 0, y: 0, w: 10, h: 10 }] },
                            { text: "Horquilla", margin: [12, -10, 0, 0] }
                        ],
                        [
                            { canvas: [{ type: 'rect', x: 0, y: 0, w: 10, h: 10 }] },
                            { text: "Shock", margin: [12, -10, 0, 0] }
                        ],
                        [
                            { canvas: [{ type: 'rect', x: 0, y: 0, w: 10, h: 10 }] },
                            { text: "Dropper", margin: [12, -10, 0, 0] }
                        ]
                    ]
                },
                { text: "Modelo/Submodelo: _______________________", margin: [0, 0, 0, 5] },
                { text: "Año: ______   Recorrido/Dimensión: __________", margin: [0, 0, 0, 5] },
                { text: "Clave ID: ____________   Detalle/Color: ____________", margin: [0, 0, 0, 5] },
                { text: "Servicio a realizar: ______________________________", margin: [0, 0, 0, 5] },
                { text: "Configuración inicial/final: _______________________", margin: [0, 0, 0, 5] },
                { text: "Presión/Resorte: ______   Progresividad/Tokens: ______", margin: [0, 0, 0, 5] },
                { text: "LSR: ____   HSR: ____   LSC: ____   HSC: ____", margin: [0, 0, 0, 10] }
            ]
        },
        {
            width: "35%",
            table: {
                widths: ["*"],
                heights: [160, 30],
                body: [
                    [{ text: "Detalles / Observaciones", alignment: "center", bold: true }],
                    [
                        {
                            columns: [
                                { text: "Fecha: ________", width: "33%", fontSize: 9 },
                                { text: "Nombre: ___________", width: "33%", fontSize: 9 },
                                { text: "Garantía: _________", width: "33%", fontSize: 9 }
                            ],
                            margin: [0, 10, 0, 0],
                            border: [true, false, true, true] // mantiene caja cerrada
                        }
                    ]
                ]
            }
        }
    ],
    columnGap: 10,
    margin: [0, 0, 0, 10]
},

// --- Total debajo del cuadro ---
{
    text: `Total: $${formData.total?.toLocaleString("es-AR") || "_____________"}`,
    alignment: "right",
    margin: [0, 10, 0, 0],
    bold: true
}
],

    styles: {
        header: { fontSize: 16, bold: true },
        boldText: { fontSize: 12, bold: true },
        info: { fontSize: 10 },
        sectionHeader: { fontSize: 11, bold: true, margin: [0, 5, 0, 3] },
        infoBox: { fontSize: 10, margin: [2, 2, 2, 2] },
        smallBox: { fontSize: 9, margin: [2, 2, 2, 2] }
    }
};

    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    const chunks = [];

    return new Promise((resolve, reject) => {
        pdfDoc.on("data", chunk => chunks.push(chunk));
        pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
        pdfDoc.end();
    });
};
