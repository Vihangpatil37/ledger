"""
Chai Ledger V4 - PDF Specification & Claude Feature Guide Generator
Compiles docs/CHAI_LEDGER_V4_CLAUDE_SPEC.html into print-perfect A4 PDF using Chrome Headless.
"""

import os
import subprocess
import shutil
import pypdfium2 as pdfium

HTML_FILE = os.path.abspath("docs/CHAI_LEDGER_V4_CLAUDE_SPEC.html")
PDF_FILE_DOCS = os.path.abspath("docs/CHAI_LEDGER_V4_CLAUDE_SPEC.pdf")
PDF_FILE_ROOT = os.path.abspath("CHAI_LEDGER_V4_CLAUDE_SPEC.pdf")
CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

print("=" * 70)
print("Chai Ledger V4 - PDF Technical Specification Generator")
print("=" * 70)

if not os.path.exists(HTML_FILE):
    raise FileNotFoundError(f"HTML specification not found at: {HTML_FILE}")

if not os.path.exists(CHROME_PATH):
    raise FileNotFoundError(f"Google Chrome executable not found at: {CHROME_PATH}")

html_size_chars = os.path.getsize(HTML_FILE)
print(f"[1/3] Source HTML: {HTML_FILE} ({html_size_chars:,} bytes)")

print(f"[2/3] Rendering print-perfect PDF via Google Chrome headless...")
abs_html = HTML_FILE.replace("\\", "/")
chrome_cmd = [
    CHROME_PATH,
    "--headless",
    "--no-sandbox",
    "--disable-gpu",
    f"--print-to-pdf={PDF_FILE_DOCS}",
    "--no-pdf-header-footer",
    f"file:///{abs_html}"
]

proc = subprocess.run(chrome_cmd, capture_output=True, text=True)
if proc.returncode != 0:
    print("Chrome STDERR:", proc.stderr)
    raise RuntimeError(f"Chrome PDF generation failed with code {proc.returncode}")

# Copy to root directory for easy access
shutil.copyfile(PDF_FILE_DOCS, PDF_FILE_ROOT)
print(f"[3/3] Copied PDF to workspace root: {PDF_FILE_ROOT}")

# PDF Inspection with pypdfium2
pdf = pdfium.PdfDocument(PDF_FILE_DOCS)
page_count = len(pdf)
file_size_kb = os.path.getsize(PDF_FILE_DOCS) / 1024

print("=" * 70)
print("BUILD COMPLETE: Chai Ledger V4 Specification for Claude")
print(f"Total Pages: {page_count} pages (A4 Print Perfect)")
print(f"File Size:   {file_size_kb:.1f} KB")
print(f"Root PDF:    {PDF_FILE_ROOT}")
print(f"Docs PDF:    {PDF_FILE_DOCS}")
print(f"Docs HTML:   {HTML_FILE}")
print("=" * 70)
