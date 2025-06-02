const express = require('express');
const router = express.Router();
const { PDFDocument } = require('pdf-lib');
const multer = require('multer');

// Set up the middleware for handling file uploads
const upload = multer({
  storage: multer.memoryStorage(), // Use memory storage
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are allowed'));
    }
    cb(null, true);
  },
});

let pdfFiles = [];

// Render the homepage
router.get('/', (req, res) => {
  res.render('index', { pdfFiles });
});

// Merge uploaded PDFs
router.post('/merge', upload.array('pdfs'), async (req, res) => {
  try {
    if (!req.files || req.files.length < 2) {
      return res.status(400).send('Please upload at least two PDF files.');
    }

    const pdfBuffers = req.files.map(file => file.buffer);
    const mergedPdfBytes = await mergePdfs(pdfBuffers);

    // Update list of uploaded file names
    pdfFiles = req.files.map(file => file.originalname);

    // Send the merged PDF
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="merged.pdf"',
    });
    res.send(Buffer.from(mergedPdfBytes));
  } catch (err) {
    console.error('Merge Error:', err);
    res.status(500).send('An error occurred while merging the PDFs');
  }
});

// Delete a file from the displayed list
router.get('/delete/:index', (req, res) => {
  const index = parseInt(req.params.index);
  if (!isNaN(index) && index >= 0 && index < pdfFiles.length) {
    pdfFiles.splice(index, 1);
  }
  res.redirect('/');
});

// Function to merge PDFs using pdf-lib
async function mergePdfs(pdfBuffers) {
  const mergedPdf = await PDFDocument.create();

  for (const pdfBytes of pdfBuffers) {
    const pdf = await PDFDocument.load(pdfBytes);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach(page => mergedPdf.addPage(page));
  }

  return await mergedPdf.save();
}

module.exports = router;
