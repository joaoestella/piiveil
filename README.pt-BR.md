# piiveil

Português · [English](README.md)

**Pseudonimização reversível de dados pessoais para o [Claude Code](https://code.claude.com).** O modelo trabalha
com tokens como `[PERSON_1]`, `[CPF_1]` e `[COMPANY_1]`; você continua vendo os dados reais na tela, e os arquivos
que o Claude Code grava saem com os dados reais.

O piiveil foi feito para documentos do **Brasil e dos Estados Unidos**: contratos, laudos, peças jurídicas,
contratos de locação, planilhas. Ele valida os identificadores do jeito que os órgãos emissores fazem (dígitos
verificadores de CPF e CNPJ, numeração única do CNJ, faixas de SSN e ITIN, prefixos de EIN) em vez de aceitar
qualquer sequência de dígitos. Tudo roda localmente: o piiveil não envia nada para lugar nenhum, e o mapa entre
tokens e valores fica num cofre cifrado no seu computador.

> **Versão 0.1 (MVP).** Leia a seção [Limitações](#limitações) antes de usar com dados reais. O piiveil reduz o que
> chega ao modelo, mas não é garantia absoluta nem substitui as medidas de proteção de dados da sua organização
> (LGPD, contratos, políticas internas).

## Como funciona

```
 arquivo no disco                      o que o modelo vê                 o que você vê / o que é gravado
 ───────────────────                   ─────────────────                 ───────────────────────────────
 Maria da Silva Souza,     Read ──►    [PERSON_1],            resposta ──►   Maria da Silva Souza,
 CPF 111.444.777-35        (mascara)   CPF [CPF_1]            (tela)         CPF 111.444.777-35

                                       Write "[PERSON_1]" ──► (desmascara) ──► arquivo com "Maria da Silva Souza"
```

O piiveil usa os hooks do Claude Code:

| Hook | O que faz |
| :- | :- |
| `PostToolUse` (todas as ferramentas) | Detecta dados pessoais na saída de Read, Grep, Glob, Bash, WebFetch, MCP e das demais ferramentas e troca cada um por um token antes de o modelo ver. Se algo falhar, oculta o conteúdo em vez de deixá-lo passar. |
| `PreToolUse` (Write, Edit, NotebookEdit, Bash, Grep, Glob, Read) | Troca os tokens pelos valores reais na entrada da ferramenta antes de ela rodar, para que os arquivos gravados e os comandos usem os dados reais. Também bloqueia o Read de PDFs e imagens (ver Limitações). |
| `MessageDisplay` | Mostra na tela os valores reais no lugar dos tokens. O modelo e a transcrição continuam só com tokens. |
| `UserPromptSubmit` | Se o que você digitou contém dado pessoal, o prompt é bloqueado (não chega ao modelo) e o piiveil mostra o token que você pode usar no lugar. |
| `SessionStart` | Explica ao modelo como usar os tokens. |

A mesma pessoa, CPF ou empresa recebe sempre o mesmo token dentro do projeto, em todas as sessões. O que já está no
cofre é reconhecido em qualquer texto, mesmo fora do contexto em que foi detectado pela primeira vez.

## Instalação

Requisitos: Claude Code com suporte a plugins e **Node.js 18 ou mais recente** no `PATH` (os hooks rodam com
`node`). Não é preciso instalar mais nada: o plugin vem com um único arquivo JavaScript já compilado em `dist/`.

Dentro do Claude Code:

```
/plugin marketplace add joaoestella/piiveil
/plugin install piiveil@piiveil
```

Para testar uma cópia local sem instalar:

```bash
git clone https://github.com/joaoestella/piiveil
claude --plugin-dir ./piiveil
```

Para conferir se está ativo, rode `/piiveil:vault-status` dentro do Claude Code.

## Uso

Trabalhe normalmente. Por exemplo, numa pasta com um contrato:

```
> Leia contrato.txt e crie partes.md com uma tabela das partes e seus CPFs.
```

O modelo lê o contrato já mascarado, escreve `partes.md` usando tokens, e o arquivo é gravado com os nomes e CPFs
reais. Na tela, a resposta aparece com os valores reais.

Veja o que o modelo recebe a partir de [`examples/peticao-inicial.md`](examples/peticao-inicial.md):

```
Processo nº [CASE_1]

**[PERSON_1]**, brasileira, solteira, professora, CPF [CPF_1], residente na Rua Exemplo
Inventado, 250, CEP [CEP_1], Belo Horizonte/MG, e-mail [EMAIL_1], telefone [PHONE_1],
por sua advogada, Dra. [PERSON_2], [OAB_1], vem propor
...
em face de **[COMPANY_1]**, CNPJ [CNPJ_1], pelos fatos a seguir.
```

### Ao digitar

O hook de prompt não pode reescrever o que você digita, apenas bloquear. Se você escrever
`qual o telefone do CPF 111.444.777-35?`, o prompt é barrado e o piiveil responde:

```
piiveil: o prompt contém 1 dado(s) pessoal(is) e não foi enviado ao modelo.
Reescreva usando os tokens abaixo (a resposta mostrará os valores reais na tela):
  • "111.444.777-35" → use [CPF_1]
```

Para textos longos, salve o conteúdo num arquivo e peça ao Claude Code para lê-lo: a leitura passa pelo
mascaramento.

### Comandos

| Comando | O que faz |
| :- | :- |
| `/piiveil:vault-status` | Mostra onde fica o cofre do projeto e quantos dados ele guarda, por tipo (sem mostrar valores). |
| `/piiveil:vault-clear` | Apaga os valores do cofre do projeto. Os tokens antigos deixam de ser traduzidos, e seus números não são reaproveitados. |

Os mesmos comandos existem na linha de comando, junto com outros úteis para conferir a detecção (os nomes em
português `limpar`, `mascarar` e `desmascarar` também funcionam):

```bash
node dist/piiveil.mjs status
node dist/piiveil.mjs clear
node dist/piiveil.mjs init                 # cria .piiveil/config.json no projeto
node dist/piiveil.mjs mask arquivo.txt     # mostra como o modelo veria o arquivo
node dist/piiveil.mjs unmask arquivo.txt   # troca tokens pelos valores reais
```

Use `--project <pasta>` (ou `--projeto`) para apontar outro projeto.

Os comandos de barra executam esse mesmo comando `node`. Se o Claude Code pedir permissão, ou se o modo automático
não conseguir avaliá-lo naquele momento, aprove ou rode o comando num terminal.

## O que é detectado

**Brasil**

| Tipo | Token | Como |
| :- | :- | :- |
| CPF | `[CPF_n]` | Com ou sem pontuação, com validação dos dígitos verificadores. |
| CNPJ | `[CNPJ_n]` | Numérico, com ou sem pontuação, e o novo formato alfanumérico (com pontuação), com validação dos dígitos verificadores. |
| CEP | `[CEP_n]` | `00000-000` ou `00.000-000`; oito dígitos corridos só com "CEP" antes. |
| Processo | `[CASE_n]` | Numeração única do CNJ, com validação do dígito verificador (módulo 97). |
| OAB | `[OAB_n]` | `OAB/SP 123.456`, `OAB-RJ nº 98765`, `OAB nº 45.678/MG` e variações, com UF válida. |
| PIS/NIS | `[PIS_n]` | Formatado, ou corrido com PIS, PASEP, NIS ou NIT antes; dígito verificador validado. |
| RG | `[RG_n]` | `12.345.678-9`, ou outros formatos com "RG" antes. |
| Telefone | `[PHONE_n]` | Fixo ou celular, com DDD válido; sem DDD, só com palavra-chave antes (Tel., Cel., WhatsApp...). |

**Estados Unidos**

| Tipo | Token | Como |
| :- | :- | :- |
| SSN | `[SSN_n]` | `123-45-6789` ou `123 45 6789`; nove dígitos corridos só depois de "SSN" ou "Social Security". Rejeita área 000, 666 e 900+, grupo 00, série 0000 e números anulados pela SSA. |
| ITIN | `[ITIN_n]` | Mesmos formatos, começando com 9 e dentro das faixas de grupo do IRS. |
| EIN | `[EIN_n]` | `12-3456789` com prefixo atribuído pelo IRS; nove dígitos corridos só depois de "EIN" ou "FEIN". |
| Telefone | `[PHONE_n]` | Números do plano norte-americano (NANP) com formatação ou `+1`; código de área e prefixo começando com 2-9, sem códigos N11. Dez dígitos corridos só depois de "phone", "cell" etc. |
| ZIP code | `[ZIP_n]` | ZIP+4 sempre; cinco dígitos só depois de sigla de estado (`CA 94103`) ou da palavra "ZIP". |

**Ambos**

| Tipo | Token | Como |
| :- | :- | :- |
| E-mail | `[EMAIL_n]` | Formato de endereço de e-mail. |
| Cartão | `[CARD_n]` | 13 a 19 dígitos, prefixo de bandeira plausível e algoritmo de Luhn. |
| Pessoa | `[PERSON_n]` | Heurística: palavras capitalizadas (ou em caixa alta) iniciadas por um prenome brasileiro ou americano frequente, com pelo menos um sobrenome; qualquer nome capitalizado logo após Sr., Sra., Dr., Dra., Mr., Ms. e similares. |
| Empresa | `[COMPANY_n]` | Razão social terminada em Ltda, S.A., S/A, EIRELI, SLU, EPP, ME, Inc., LLC, Corp., Ltd., LLP ou L.P. |
| Termo | `[TERM_n]` | Lista de termos que você sempre quer mascarar. |

## Configuração

Rode `node dist/piiveil.mjs init` na pasta do projeto, ou crie `.piiveil/config.json` à mão (há um exemplo em
[`examples/config.json`](examples/config.json)). Também é possível ter uma configuração global em
`~/.piiveil/config.json`; as listas das duas são somadas e os valores simples do projeto prevalecem.

| Opção | Padrão | Descrição |
| :- | :- | :- |
| `terms` | `[]` | Termos sempre mascarados como `[TERM_n]` (nome de operação, de cliente, de fazenda...). |
| `names` | `[]` | Nomes de pessoas sempre mascarados, mesmo os que a heurística não pega. |
| `companies` | `[]` | Nomes de empresas sempre mascarados, mesmo sem sufixo societário. |
| `firstNames` | `[]` | Prenomes extras para a heurística de nomes. |
| `ignore` | `[]` | Trechos que nunca devem ser mascarados (por exemplo, o nome de um autor citado). |
| `disabledTypes` | `[]` | Tipos a não detectar, como `["PHONE", "ZIP"]`. |
| `prompt` | `"block"` | `"block"` (bloquear), `"warn"` (deixa passar e avisa) ou `"off"` (desligado). |
| `blockBinaryFiles` | `true` | Impede o Read de PDFs e imagens. |
| `unmaskBash` | `true` | Troca tokens por valores reais nos comandos do Bash. |
| `language` | `"auto"` | Idioma das mensagens do piiveil: `"auto"`, `"en"` ou `"pt-BR"`. Em auto, decide `PIIVEIL_LANG` ou a localidade do sistema. |
| `enabled` | `true` | Liga ou desliga o piiveil no projeto. |

Os nomes em português (`termos`, `nomes`, `empresas`, `prenomes`, `ignorar`, `tiposDesativados`, `ativo`,
`idioma`...) também são aceitos, assim como os valores `bloquear`, `avisar` e `desligado` em `prompt`.

A configuração pode conter nomes reais. **Não versione a pasta `.piiveil/`**: o `init` já cria um `.gitignore`
dentro dela.

## Cofre e chave

- O cofre de cada projeto fica em `~/.piiveil/cofres/<id>.cofre`, **fora da pasta do projeto**, para que não seja
  versionado nem copiado junto por acidente. O `<id>` é derivado do caminho do projeto.
- O conteúdo é cifrado com AES-256-GCM, que também detecta adulteração. A gravação é atômica e protegida por trava,
  já que vários hooks podem rodar ao mesmo tempo.
- A chave é gerada aleatoriamente na primeira vez e guardada em `~/.piiveil/chave` com permissão `600`.
  Alternativamente, defina a variável `PIIVEIL_PASSPHRASE` para derivar a chave de uma senha (scrypt); nesse caso a
  chave não fica em disco, mas a senha precisa estar no ambiente de cada sessão.
- `PIIVEIL_HOME` muda a pasta base (`~/.piiveil`).
- Se a chave for perdida, os tokens não podem mais ser traduzidos. Os arquivos já gravados não são afetados, pois
  contêm os dados reais.

## Limitações

Algumas destas limitações vêm do próprio Claude Code e foram confirmadas testando o plugin na versão 2.1.289.

- **Arquivos citados com `@` não passam pelos hooks.** O conteúdo vai direto para o modelo, sem mascaramento. Peça
  para ler o arquivo ("leia contrato.txt") em vez de usar `@`. Para pastas com dados sensíveis, crie uma regra de
  negação de leitura no `.claude/settings.json` do projeto:

  ```json
  {
    "permissions": {
      "deny": ["Read(./dados-sensiveis/**)"]
    }
  }
  ```

  Segundo a documentação, o Claude Code aplica regras de `Read` às menções com `@` em regime de melhor esforço.
  Essa regra também impede o Read nessa pasta; o conteúdo continua acessível pelo Bash (por exemplo, `cat`), cuja
  saída é mascarada.
- **Edit com tokens no `old_string`.** O Claude Code confere se o `old_string` existe no arquivo antes de rodar o
  `PreToolUse`, então um trecho com tokens nunca é encontrado. As instruções de início de sessão pedem ao modelo um
  `old_string` sem tokens (o `new_string` pode tê-los) ou, se não houver trecho assim, a reescrita do arquivo com
  Write. Quando o hook roda, a troca funciona, e há teste para isso.
- **PDFs e imagens** lidos pelo Read chegam ao modelo como documento ou imagem, sem texto para mascarar. Por isso o
  piiveil bloqueia esse Read por padrão; extraia o texto pelo Bash (`pdftotext arquivo.pdf -`), cuja saída é
  mascarada.
- **Detecção de nomes por heurística.** Nomes que não começam por um prenome da lista (a não ser depois de Sr.,
  Dra., Mr. etc.), nomes estrangeiros menos comuns e prenomes sozinhos podem passar. Também há falsos positivos,
  como nomes de ruas que homenageiam pessoas ou títulos em inglês com iniciais maiúsculas que começam por um
  prenome. Endereços, datas de nascimento, CNH, passaporte e outros dados sem formato fixo não são detectados no
  MVP; use `terms` e `names` para o que for importante. A detecção por NER está planejada para a fase 2.
- **Grafias diferentes viram tokens diferentes.** `LARISSA COUTO` e `Larissa Couto` recebem tokens distintos,
  porque cada token volta exatamente para o texto original.
- **Comandos do Bash recebem os dados reais.** Um comando como `curl` com um token enviaria o valor real para fora.
  Revise os comandos antes de aprovar, ou defina `unmaskBash: false`. Valores com aspas ou caracteres especiais do
  shell não são inseridos em comandos: o piiveil nega a execução.
- **Se o hook não conseguir nem iniciar** (por exemplo, sem `node` no `PATH`), o Claude Code trata isso como erro
  não bloqueante e a saída original segue para o modelo. Quando o hook roda e algo dá errado, a falha é fechada: o
  conteúdo é ocultado ou a sessão é interrompida.
- **Tela.** Um token dividido entre dois pedaços da resposta pode aparecer como token na tela.
- **Texto que já contém algo igual a um token** (como `[PERSON_1]` literal no documento original) seria trocado ao
  desmascarar.
- **Diferenças em relação à documentação de hooks**, encontradas nos testes com o Claude Code: a saída da
  ferramenta chega em `tool_response` (objeto com o formato de cada ferramenta), e não em `tool_output` (texto), e
  `updatedToolOutput` precisa manter esse formato, senão é ignorado; o `MessageDisplay` recebe o texto no campo
  `delta`; o `UserPromptSubmit` não tem `suppressOriginalPrompt`, mas um prompt bloqueado já é descartado sem chegar
  ao modelo. O piiveil aceita as duas formas onde há diferença.

### Sobre a LGPD

Pseudonimização, na definição da LGPD (art. 13, § 4º), é o tratamento pelo qual um dado perde a possibilidade de
associação a um indivíduo, senão pelo uso de informação adicional mantida separadamente em ambiente controlado e
seguro. É o que o piiveil faz em relação ao modelo: o cofre é essa informação adicional e fica só na sua máquina.
Dados pseudonimizados continuam sendo dados pessoais, e o uso do piiveil não dispensa as demais obrigações (base
legal, contratos com fornecedores, registro das operações, orientação do encarregado). Este projeto não é
aconselhamento jurídico.

## Desenvolvimento

```bash
npm install
npm test          # compila com tsc e roda os testes (node:test)
npm run bundle    # gera dist/piiveil.mjs com esbuild
```

O `dist/piiveil.mjs` é versionado porque a instalação de plugins não executa etapa de build; um teste falha se ele
estiver desatualizado em relação a `src/`. O código e os comentários estão em português; contribuições em português
ou inglês são bem-vindas.

```
.claude-plugin/   plugin.json e marketplace.json
hooks/hooks.json  registro dos hooks
skills/           comandos /piiveil:vault-status e /piiveil:vault-clear
src/detectors/    detectores, validação de dígitos e listas de prenomes (Brasil e EUA)
src/vault/        criptografia e cofre
src/hooks/        um arquivo por hook
src/i18n.ts       mensagens em inglês e português
src/cli.ts        linha de comando e ponto de entrada dos hooks
tests/            testes; tests/fixtures/ tem documentos sintéticos
examples/         documentos e configuração de exemplo, todos fictícios
```

Todos os documentos de teste e de exemplo são sintéticos. Os números de CPF, CNPJ, PIS, SSN, EIN e cartão foram
gerados para satisfazer as regras de validação apenas para exercitar os detectores; qualquer coincidência com
documentos reais é acidental.

## Licença

[MIT](LICENSE)
