import potrace from "potrace";
import { writeFileSync } from "node:fs";
const src = process.argv[2], out = process.argv[3];
potrace.trace(src, { threshold: 128, turdSize: 40, optCurve: true, alphaMax: 1.2, color: "#1a1e3a" },
  (err, svg) => {
    if (err) throw err;
    writeFileSync(out, svg);
    console.log("wrote", out, svg.length, "bytes");
  });
