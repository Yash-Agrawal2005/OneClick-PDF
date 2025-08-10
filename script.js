// script.js
document.addEventListener("DOMContentLoaded", () => {
  // ----- Globals -----
  const openButtons = document.querySelectorAll(".btn-open");
  const modals = document.querySelectorAll(".modal");
  const closeButtons = document.querySelectorAll(".modal-close");

  // files state
  let mergeFiles = [];
  let imageFiles = [];
  let splitFile = null;
  let compressFile = null;

  // progress helpers
  function showProgress(containerId, pct) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const bar = container.querySelector(".progress-bar");
    container.classList.remove("hidden");
    bar.style.width = `${pct}%`;
    if (pct >= 100) {
      setTimeout(()=> container.classList.add("hidden"), 700);
      bar.style.width = `0%`;
    }
  }

  // utility: download blob/bytes
  function downloadBytes(bytes, filename, mime = "application/pdf") {
    const blob = new Blob([bytes], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // ----- Modal open/close and scroll -----
  openButtons.forEach(btn => {
    btn.addEventListener("click", (e) => {
      const card = e.target.closest(".tool-card");
      if (!card) return;
      const modalId = `${card.id}-modal`;
      const modal = document.getElementById(modalId);

      // close all, then open only the clicked one
      modals.forEach(m => { if (m.id !== modalId) m.classList.add("hidden"); });
      if (modal) {
        modal.classList.remove("hidden");
        // scroll page to modal
        modal.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  closeButtons.forEach(btn => {
    btn.addEventListener("click", closeAllModals);
  });

  modals.forEach(modal => {
    modal.addEventListener("click", (e) => {
      if (e.target.classList.contains("modal")) closeAllModals();
    });
  });

  function closeAllModals() {
    modals.forEach(m => m.classList.add("hidden"));
    mergeFiles = [];
    imageFiles = [];
    splitFile = null;
    compressFile = null;
    updateAllLists();
  }

  // ----- File list UI helpers -----
  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  }

  function createFileRow(file, onRemove, isImage = false) {
  const div = document.createElement("div");
  div.className = "file-row";

  // Instead of showing actual image, show an icon + filename + size
  const icon = document.createElement("div");
  icon.className = "file-icon";
  icon.textContent = isImage ? "🖼️" : "📄";
  div.appendChild(icon);

  const meta = document.createElement("div");
  meta.className = "file-meta";
  meta.innerHTML = `<div class="file-name">${file.name}</div><div class="file-size">${formatBytes(file.size)}</div>`;
  div.appendChild(meta);

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "file-remove";
  remove.textContent = "Remove";
  remove.addEventListener("click", onRemove);
  div.appendChild(remove);

  return div;
}


  function updateList(containerId, filesArray, isImage = false) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = "";
    filesArray.forEach((f, idx) => {
      const row = createFileRow(f, () => {
        filesArray.splice(idx, 1);
        updateAllLists();
      }, isImage);
      container.appendChild(row);
    });
  }

  function updateAllLists() {
  updateList("merge-file-list", mergeFiles, false);
  updateList("images-file-list", imageFiles, true);

  // Fix for split-file-list: append actual element, not outerHTML string
  const sf = document.getElementById("split-file-list");
  if (sf) {
    sf.innerHTML = "";
    if (splitFile) {
      sf.appendChild(createFileRow(splitFile, () => {
        splitFile = null;
        updateAllLists();
      }));
    }
  }

  // Fix for compress-file-list: same fix
  const cf = document.getElementById("compress-file-list");
  if (cf) {
    cf.innerHTML = "";
    if (compressFile) {
      cf.appendChild(createFileRow(compressFile, () => {
        compressFile = null;
        updateAllLists();
      }));
    }
  }
}


  // ----- Generic drag/drop + input wiring -----
  function setupFileHandler({ dropZoneId, inputId, acceptMultiple = false, onFiles }) {
    const dz = document.getElementById(dropZoneId);
    const fi = document.getElementById(inputId);
    if (!dz || !fi) return;
    dz.addEventListener("click", () => fi.click());
    dz.addEventListener("dragover", (e) => { e.preventDefault(); dz.classList.add("dragover"); });
    dz.addEventListener("dragleave", () => dz.classList.remove("dragover"));
    dz.addEventListener("drop", (e) => {
      e.preventDefault();
      dz.classList.remove("dragover");
      handleFiles(e.dataTransfer.files);
    });
    fi.addEventListener("change", (e) => handleFiles(e.target.files));
    function handleFiles(fileList) {
      const files = Array.from(fileList);
      if (!acceptMultiple && files.length !== 1) {
        alert("Please select exactly one file for this tool.");
        return;
      }
      onFiles(files);
      updateAllLists();
    }
  }

  // Merge files: allow multiple
  setupFileHandler({
    dropZoneId: "merge-drop-zone",
    inputId: "merge-file-input",
    acceptMultiple: true,
    onFiles: (files) => {
      // append all selected files (avoid duplicates by name+size)
      files.forEach(f => {
        const exists = mergeFiles.some(m => m.name === f.name && m.size === f.size);
        if (!exists) mergeFiles.push(f);
      });
    }
  });

  // Images to PDF: allow multiple images
  setupFileHandler({
    dropZoneId: "images-drop-zone",
    inputId: "images-file-input",
    acceptMultiple: true,
    onFiles: (files) => {
      files.forEach(f => {
        const exists = imageFiles.some(m => m.name === f.name && m.size === f.size);
        if (!exists) imageFiles.push(f);
      });
    }
  });

  // Split: exactly one PDF
  setupFileHandler({
    dropZoneId: "split-drop-zone",
    inputId: "split-file-input",
    acceptMultiple: false,
    onFiles: (files) => { splitFile = files[0]; }
  });

  // Compress: exactly one PDF
  setupFileHandler({
    dropZoneId: "compress-drop-zone",
    inputId: "compress-file-input",
    acceptMultiple: false,
    onFiles: (files) => { compressFile = files[0]; }
  });

  // manual clear buttons
  document.getElementById("merge-clear-btn")?.addEventListener("click", ()=>{ mergeFiles=[]; updateAllLists(); });
  document.getElementById("images-clear-btn")?.addEventListener("click", ()=>{ imageFiles=[]; updateAllLists(); });
  document.getElementById("split-clear-btn")?.addEventListener("click", ()=>{ splitFile=null; updateAllLists(); });
  document.getElementById("compress-clear-btn")?.addEventListener("click", ()=>{ compressFile=null; updateAllLists(); });

  // ----- ACTIONS: Merge / Images->PDF / Split / Compress -----

  // Merge using pdf-lib
  document.getElementById("merge-action-btn")?.addEventListener("click", async () => {
    if (mergeFiles.length === 0) { alert("Add at least one PDF to merge."); return; }
    try {
      showProgress("merge-progress-container", 5);
      const outPdf = await PDFLib.PDFDocument.create();

      for (let i = 0; i < mergeFiles.length; i++) {
        const f = mergeFiles[i];
        const buf = await f.arrayBuffer();
        const src = await PDFLib.PDFDocument.load(buf);
        const count = src.getPageCount();
        const indices = Array.from({length: count}, (_, k) => k);
        const copied = await outPdf.copyPages(src, indices);
        copied.forEach(p => outPdf.addPage(p));
        showProgress("merge-progress-container", Math.round(((i+1)/mergeFiles.length) * 60));
      }

      const mergedBytes = await outPdf.save();
      showProgress("merge-progress-container", 100);
      downloadBytes(mergedBytes, "merged.pdf");
    } catch (err) {
      console.error(err);
      alert("Error while merging PDFs: " + (err.message || err));
    }
  });

  // Images -> PDF
  document.getElementById("images-action-btn")?.addEventListener("click", async () => {
    if (imageFiles.length === 0) { alert("Add at least one image."); return; }
    try {
      showProgress("merge-progress-container", 5); // reuse a progress bar location if you like
      const pdfDoc = await PDFLib.PDFDocument.create();
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const bytes = await file.arrayBuffer();
        let img;
        if (file.type.includes("png")) img = await pdfDoc.embedPng(bytes);
        else img = await pdfDoc.embedJpg(bytes);
        const page = pdfDoc.addPage([img.width, img.height]);
        page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
        showProgress("merge-progress-container", Math.round(((i+1)/imageFiles.length) * 90));
      }
      const out = await pdfDoc.save();
      showProgress("merge-progress-container", 100);
      downloadBytes(out, "images-to-pdf.pdf");
    } catch (err) {
      console.error(err);
      alert("Error converting images: " + (err.message || err));
    }
  });

  // Split: parse pages, create separate PDFs and zip
  function parseRanges(str, totalPages) {
    if (!str) return [];
    const parts = str.split(",").map(s => s.trim()).filter(Boolean);
    const ranges = [];
    for (const p of parts) {
      if (p.includes("-")) {
        const [a,b] = p.split("-").map(x => parseInt(x,10));
        if (isNaN(a) || isNaN(b)) continue;
        const start = Math.max(1, Math.min(a,b));
        const end = Math.min(totalPages, Math.max(a,b));
        ranges.push({ start, end });
      } else {
        const n = parseInt(p,10);
        if (!isNaN(n)) ranges.push({ start: n, end: n });
      }
    }
    return ranges;
  }

 document.getElementById("split-action-btn")?.addEventListener("click", async () => {
  if (!splitFile) { alert("Select a PDF to split."); return; }
  
  const mode = document.querySelector('input[name="split-mode"]:checked')?.value;
  const pagesInput = document.getElementById("split-pages").value.trim();

  try {
    showProgress("split-progress-container", 5);
    const buf = await splitFile.arrayBuffer();
    const src = await PDFLib.PDFDocument.load(buf);
    const total = src.getPageCount();

    const zip = new JSZip();

    if (mode === "every") {
      // Split every page separately
      for (let p = 0; p < total; p++) {
        const out = await PDFLib.PDFDocument.create();
        const [copied] = await out.copyPages(src, [p]);
        out.addPage(copied);
        const bytes = await out.save();
        zip.file(`page_${p + 1}.pdf`, bytes);
        showProgress("split-progress-container", Math.round(((p + 1) / total) * 90));
      }
    } else if (mode === "range") {
      // Split by ranges entered by user
      const ranges = parseRanges(pagesInput, total);
      if (ranges.length === 0) {
        alert("Enter valid page ranges like 1-3,5,7");
        showProgress("split-progress-container", 0);
        return;
      }
      for (let i = 0; i < ranges.length; i++) {
        const { start, end } = ranges[i];
        const out = await PDFLib.PDFDocument.create();
        const indices = [];
        for (let p = start; p <= end; p++) indices.push(p - 1);
        const copied = await out.copyPages(src, indices);
        copied.forEach(p => out.addPage(p));
        const bytes = await out.save();
        zip.file(`split_${start}-${end}.pdf`, bytes);
        showProgress("split-progress-container", Math.round(((i + 1) / ranges.length) * 90));
      }
    } else {
      alert("Please select a split mode.");
      showProgress("split-progress-container", 0);
      return;
    }

    const z = await zip.generateAsync({ type: "blob" }, (meta) => {
      showProgress("split-progress-container", Math.round(meta.percent));
    });
    downloadBytes(await z.arrayBuffer(), "split_files.zip", "application/zip");
    showProgress("split-progress-container", 100);

  } catch (err) {
    console.error(err);
    alert("Error splitting PDF: " + (err.message || err));
  }
});


  // Compress: rasterize with pdf.js and rebuild a PDF (client-side, works best for small PDFs)
  // WARNING: this approach may lose text/selectability (pages become images), but reduces file size by lowering image quality.
  // Set worker for pdf.js (make sure version matches your pdf.js include)
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.worker.min.js';
  } catch (e) {
    console.warn("pdfjs worker setup failed", e);
  }

  function dataURLToUint8Array(dataURL) {
    const base64 = dataURL.split(',')[1];
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  document.getElementById("compress-action-btn")?.addEventListener("click", async () => {
    if (!compressFile) { alert("Select a PDF to compress."); return; }
    const quality = parseFloat(document.getElementById("compress-quality")?.value || 0.6);
    try {
      showProgress("compress-progress-container", 5);
      const buf = await compressFile.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: buf });
      const pdf = await loadingTask.promise;
      const outPdf = await PDFLib.PDFDocument.create();
      for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p);
        const viewport = page.getViewport({ scale: 1.0 }); // adjust scale to trade quality vs size
        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const ctx = canvas.getContext("2d");
        await page.render({ canvasContext: ctx, viewport }).promise;
        // convert to jpeg with selected quality
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        const imgBytes = dataURLToUint8Array(dataUrl);
        const embedded = await outPdf.embedJpg(imgBytes);
        const pageObj = outPdf.addPage([embedded.width, embedded.height]);
        pageObj.drawImage(embedded, { x: 0, y: 0, width: embedded.width, height: embedded.height });
        showProgress("compress-progress-container", Math.round((p / pdf.numPages) * 90));
      }
      const compressed = await outPdf.save();
      showProgress("compress-progress-container", 100);
      downloadBytes(compressed, `compressed_${compressFile.name}`);
    } catch (err) {
      console.error(err);
      alert("Error compressing PDF: " + (err.message || err));
    }
  });

  // ----- Initialize UI from state -----
  updateAllLists();
});
