import express from "express";
import { generateTicket } from "../services/pdf/ticketPdf.service.js";
import { generateFormPdf } from "../services/pdf/formPdf.service.js";

const router = express.Router();

router.post('/generate', async (req, res) => {
    try {
        const pdfBuffer = await generateTicket(req.body);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=ticket.pdf');
        res.send(pdfBuffer);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error generating Ticket PDF');
    }
});

router.post('/form', async (req, res) => {
    try {
        const pdfBuffer = await generateFormPdf(req.body);

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=formulario.pdf');
        res.send(pdfBuffer);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error generating form pdf');
    }
});

export default router;