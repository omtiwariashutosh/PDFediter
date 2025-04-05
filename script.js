let pdfDoc = null;
let totalPages = 0;
let removedPages = new Set();
let originalPdfBytes = null;

// Upload PDF
document.getElementById("pdfFile").addEventListener("change", function (event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function () {
      const typedArray = new Uint8Array(this.result);
      originalPdfBytes = typedArray;
      loadPDF(typedArray);
    };
    reader.readAsArrayBuffer(file);
  }
});

// Load PDF
function loadPDF(pdfData) {
  pdfjsLib.getDocument(pdfData).promise.then((pdf) => {
    pdfDoc = pdf;
    totalPages = pdf.numPages;
    updatePageIndicator();
    renderAllPages();
    generateThumbnails();
  });
}

// Update page indicator
function updatePageIndicator() {
  const totalSpan = document.getElementById("totalPages");
  if (totalSpan) totalSpan.textContent = totalPages - removedPages.size;
}

// Render all visible pages
function renderAllPages() {
  const viewer = document.getElementById("pdfViewer");
  viewer.innerHTML = "";

  for (let i = 1; i <= totalPages; i++) {
    if (removedPages.has(i)) continue;

    pdfDoc.getPage(i).then((page) => {
      const scale = 1.2;
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      page.render(renderContext);

      const pageContainer = document.createElement("div");
      pageContainer.className = "pdf-page";
      pageContainer.id = `page-${i}`;
      pageContainer.setAttribute("data-page-number", i);
      pageContainer.appendChild(canvas);

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "delete-btn";
      deleteBtn.textContent = "×";
      deleteBtn.onclick = () => {
        removedPages.add(i);
        updatePageIndicator();
        renderAllPages();
        generateThumbnails();
      };

      pageContainer.appendChild(deleteBtn);
      viewer.appendChild(pageContainer);
    });
  }
}

// Generate thumbnails
function generateThumbnails() {
  const thumbnailContainer = document.getElementById("thumbnailContainer");
  thumbnailContainer.innerHTML = `
    <div id="pageIndicator">Page: <span id="currentPage">1</span> / <span id="totalPages">${
      totalPages - removedPages.size
    }</span></div>
  `;

  for (let i = 1; i <= totalPages; i++) {
    if (removedPages.has(i)) continue;

    pdfDoc.getPage(i).then((page) => {
      const scale = 0.3;
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement("canvas");
      canvas.className = "thumbnail";
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const context = canvas.getContext("2d");
      page.render({ canvasContext: context, viewport: viewport });

      canvas.addEventListener("click", () => {
        document
          .getElementById(`page-${i}`)
          .scrollIntoView({ behavior: "smooth", block: "start" });
      });

      thumbnailContainer.appendChild(canvas);
    });
  }
}

// Track and display current page number
document.getElementById("pdfViewer").addEventListener("scroll", () => {
  const pages = document.querySelectorAll(".pdf-page");
  let viewerTop = document.getElementById("pdfViewer").scrollTop;
  let closestPage = null;
  let minDistance = Infinity;

  pages.forEach((page) => {
    const rect = page.getBoundingClientRect();
    const offset = Math.abs(rect.top - 90);
    if (offset < minDistance) {
      minDistance = offset;
      closestPage = page;
    }
  });

  if (closestPage) {
    const pageNumber = closestPage.getAttribute("data-page-number");
    document.getElementById("currentPage").textContent = pageNumber;
  }
});

// Download updated PDF
document
  .getElementById("downloadBtn")
  .addEventListener("click", async function () {
    if (!originalPdfBytes) return;

    const pdfDocOriginal = await PDFLib.PDFDocument.load(originalPdfBytes);
    const pdfDocNew = await PDFLib.PDFDocument.create();

    for (let i = 0; i < pdfDocOriginal.getPageCount(); i++) {
      if (!removedPages.has(i + 1)) {
        const [copiedPage] = await pdfDocNew.copyPages(pdfDocOriginal, [i]);
        pdfDocNew.addPage(copiedPage);
      }
    }

    const newPdfBytes = await pdfDocNew.save();
    const blob = new Blob([newPdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "updated.pdf";
    a.click();

    URL.revokeObjectURL(url);
  });
