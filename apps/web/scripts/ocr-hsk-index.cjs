const {createWorker} = require(process.env.TESSERACT_JS_PATH || 'tesseract.js');
const fs = require('node:fs');
const path = require('node:path');
const directory = path.resolve(process.argv[2]);
(async()=>{
 const worker=await createWorker(['chi_sim','eng'],1,{cachePath:directory});
 await worker.setParameters({preserve_interword_spaces:'1',tessedit_pageseg_mode:'6'});
 const start=Number(process.argv[3]||1),end=Number(process.argv[4]||35);
 for(let i=start;i<=end;i++){
   const out=path.join(directory,`ocr-full-${i}.json`);
   if(fs.existsSync(out))continue;
   const {data}=await worker.recognize(path.join(directory,`scan-${i}.png`),{}, {text:true,tsv:true});
   fs.writeFileSync(out,JSON.stringify({text:data.text,tsv:data.tsv},null,2));
   console.log(`OCR page ${i}: ${data.text.slice(0,60).replaceAll('\n',' | ')}`);
 }
 await worker.terminate();
})().catch(e=>{console.error(e);process.exitCode=1;});
