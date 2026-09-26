from pathlib import Path
import sys
import pypdfium2 as pdfium
doc=pdfium.PdfDocument(sys.argv[1])
out=Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
for i,page in enumerate(doc):
    image=page.render(scale=3).to_pil()
    # Number, level and Chinese headword. Meanings are extracted from the other two PDFs.
    w,h=image.size
    image.crop((int(w*.085),int(h*.09),int(w*.31),int(h*.94))).save(out/f'scan-{i+1}.png')
