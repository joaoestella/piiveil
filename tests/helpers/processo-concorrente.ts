// Executado como processo filho no teste de concorrência do cofre.
import { Cofre } from "../../src/vault/cofre.js";

const [projeto, prefixo, quantidade] = process.argv.slice(2);
for (let i = 0; i < Number(quantidade); i++) {
  await Cofre.comTrava(projeto as string, (c) => {
    c.tokenPara(`${prefixo}-${i}`, "TERM");
  });
}
