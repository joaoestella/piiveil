/**
 * Prenomes frequentes no Brasil, usados pela heurística de nomes de pessoas.
 * Estão sem acento e em minúsculas; a comparação é feita após normalizar o texto.
 * A lista pode ser ampliada pelo usuário com a opção `prenomes` da configuração.
 */
export const PRENOMES: readonly string[] = [
  // Femininos
  "maria", "ana", "francisca", "antonia", "adriana", "juliana", "marcia", "fernanda", "patricia", "aline",
  "sandra", "camila", "amanda", "bruna", "jessica", "leticia", "julia", "luciana", "vanessa", "mariana",
  "gabriela", "vera", "vitoria", "larissa", "claudia", "beatriz", "rita", "luana", "sonia", "renata",
  "eliane", "josefa", "simone", "natalia", "cristiane", "carla", "debora", "rosangela", "jaqueline", "rosa",
  "daniela", "aparecida", "marlene", "terezinha", "raimunda", "andreia", "fabiana", "lucia", "raquel", "angela",
  "rafaela", "joana", "luzia", "elaine", "daniele", "regina", "sabrina", "silvia", "tatiane", "michele",
  "isabela", "isabel", "priscila", "carolina", "bianca", "alessandra", "kelly", "cristina", "tais", "thais",
  "monica", "denise", "helena", "alice", "laura", "valentina", "sophia", "sofia", "manuela", "heloisa",
  "lorena", "livia", "giovanna", "giovana", "yasmin", "lara", "cecilia", "eduarda", "clara", "lais",
  "marina", "nicole", "rebeca", "esther", "ester", "agatha", "isadora", "melissa", "emanuelly", "pietra",
  "milena", "elisa", "antonella", "catarina", "olivia", "luiza", "luisa", "lavinia", "stella", "estela",
  "eloa", "aurora", "allana", "ayla", "liz", "malu", "mirella", "barbara", "carina", "cintia",
  "edna", "elisangela", "edilene", "fatima", "gisele", "graziela", "ingrid", "ivone", "jussara", "karina",
  "katia", "lilian", "lucimara", "madalena", "marta", "neide", "noemi", "odete", "paula", "roberta",
  "rosana", "rosilene", "selma", "solange", "suelen", "tania", "tereza", "teresa", "valeria", "viviane",
  "zilda", "irene", "iracema", "glaucia", "gloria", "graca", "conceicao", "dalva", "dulce", "elza",
  "fabiola", "flavia", "jordana", "kamila", "keila", "marcela", "micaela", "nadia", "nathalia", "neusa",
  "nilza", "olga", "pamela", "poliana", "rosemary", "sara", "sarah", "silvana", "susana", "suzana",
  "talita", "thaynara", "veronica", "vilma", "yara", "zuleica", "ariane", "aurea", "benedita", "celia",
  "cleide", "creusa", "dayane", "diana", "elen", "ellen", "emilia", "erica", "erika", "eva",
  "geovana", "helen", "hellen", "ilda", "ines", "jaine", "jamile", "jenifer", "joyce", "juliane",
  "kaline", "lidia", "lucilene", "mayara", "nayara", "rayane", "samara", "tamires", "tatiana", "thalita",
  // Masculinos
  "jose", "joao", "antonio", "francisco", "carlos", "paulo", "pedro", "lucas", "luiz", "luis",
  "marcos", "gabriel", "rafael", "daniel", "marcelo", "bruno", "eduardo", "felipe", "raimundo", "rodrigo",
  "manoel", "manuel", "mateus", "matheus", "andre", "fernando", "fabio", "leonardo", "gustavo", "guilherme",
  "leandro", "tiago", "thiago", "anderson", "ricardo", "marcio", "jorge", "sebastiao", "alexandre", "roberto",
  "edson", "diego", "vitor", "victor", "sergio", "claudio", "joaquim", "renato", "vinicius", "geraldo",
  "adriano", "luciano", "julio", "renan", "alex", "vagner", "wagner", "jefferson", "flavio", "cicero",
  "miguel", "arthur", "artur", "heitor", "bernardo", "davi", "david", "theo", "lorenzo", "samuel",
  "enzo", "benjamin", "nicolas", "henrique", "isaac", "murilo", "lorenzo", "joaquim", "caua", "vicente",
  "caio", "otavio", "bento", "antony", "emanuel", "benicio", "ravi", "noah", "anthony", "levi",
  "augusto", "benedito", "caetano", "cesar", "cristiano", "denis", "domingos", "edgar", "elias", "emerson",
  "evandro", "everton", "fabricio", "gilberto", "gilmar", "givaldo", "hugo", "igor", "ivan", "jair",
  "jairo", "jeferson", "joel", "jonas", "jonathan", "josue", "juliano", "junior", "kleber", "leonel",
  "lourenco", "marcelino", "mario", "mauricio", "mauro", "milton", "moises", "nelson", "nilton", "orlando",
  "osvaldo", "oswaldo", "patrick", "rafael", "reginaldo", "reinaldo", "ronaldo", "rogerio", "ruan", "rubens",
  "silvio", "valdir", "valter", "walter", "washington", "wellington", "wesley", "willian", "william", "wilson",
  "yuri", "alan", "allan", "alberto", "alfredo", "alisson", "almir", "aloisio", "amaro", "anselmo",
  "aurelio", "baltazar", "benedicto", "bruno", "camilo", "celso", "clayton", "cleber", "cristian", "danilo",
  "decio", "dirceu", "edivaldo", "edmilson", "eduardo", "eliseu", "erick", "erico", "ernesto", "fagner",
  "fausto", "felix", "frederico", "genival", "gerson", "gileno", "glauber", "heitor", "helio", "hamilton",
  "iago", "ismael", "jadson", "jailson", "jaime", "jean", "joaquim", "jonatas", "josias", "kaique",
  "kauan", "kevin", "lauro", "lazaro", "luan", "marcus", "mariano", "max", "nathan", "natan",
  "nivaldo", "otavio", "pablo", "raul", "ricardo", "robson", "romulo", "sandro", "saulo", "severino",
  "tarcisio", "teodoro", "tomas", "thomas", "ubirajara", "ulisses", "vanderlei", "wanderley", "zacarias", "zeca",
];

/**
 * Prenomes frequentes nos Estados Unidos. Ficaram de fora os que são também
 * palavras comuns em inglês (Will, May, June, Hope, Faith, Joy, Art, Bill...),
 * para reduzir falsos positivos em títulos.
 */
export const PRENOMES_EUA: readonly string[] = [
  // Masculinos
  "james", "john", "robert", "michael", "william", "david", "richard", "joseph", "thomas", "charles",
  "christopher", "daniel", "matthew", "anthony", "mark", "donald", "steven", "steve", "paul", "andrew",
  "joshua", "kenneth", "kevin", "brian", "george", "timothy", "ronald", "edward", "jason", "jeffrey",
  "ryan", "jacob", "gary", "nicholas", "eric", "jonathan", "stephen", "larry", "justin", "scott",
  "brandon", "benjamin", "samuel", "gregory", "alexander", "frank", "patrick", "raymond", "jack", "dennis",
  "jerry", "tyler", "aaron", "adam", "nathan", "henry", "douglas", "zachary", "peter", "kyle",
  "ethan", "walter", "noah", "jeremy", "christian", "keith", "roger", "terry", "gerald", "harold",
  "sean", "austin", "carl", "arthur", "lawrence", "dylan", "jesse", "jordan", "bryan", "billy",
  "joe", "bruce", "gabriel", "logan", "albert", "willie", "alan", "juan", "wayne", "elijah",
  "randy", "roy", "vincent", "ralph", "eugene", "russell", "bobby", "mason", "philip", "louis",
  "harry", "howard", "fred", "johnny", "jimmy", "dustin", "travis", "chad", "derek", "shawn",
  "liam", "oliver", "lucas", "aiden", "jayden", "caleb", "luke", "owen", "wyatt", "hunter",
  "connor", "isaiah", "carter", "landon", "jaxon", "lincoln", "grayson", "cooper", "colton", "brayden",
  // Femininos
  "mary", "patricia", "jennifer", "linda", "elizabeth", "barbara", "susan", "jessica", "sarah", "karen",
  "lisa", "nancy", "betty", "margaret", "sandra", "ashley", "kimberly", "emily", "donna", "michelle",
  "carol", "amanda", "dorothy", "melissa", "deborah", "stephanie", "rebecca", "sharon", "laura", "cynthia",
  "kathleen", "amy", "angela", "shirley", "anna", "brenda", "pamela", "emma", "nicole", "helen",
  "samantha", "katherine", "christine", "debra", "rachel", "carolyn", "janet", "catherine", "heather", "diane",
  "ruth", "julie", "olivia", "joyce", "virginia", "victoria", "kelly", "lauren", "christina", "joan",
  "evelyn", "judith", "megan", "andrea", "cheryl", "hannah", "jacqueline", "martha", "gloria", "teresa",
  "ann", "sara", "madison", "frances", "kathryn", "janice", "jean", "abigail", "alice", "judy",
  "sophia", "grace", "denise", "amber", "doris", "marilyn", "danielle", "beverly", "isabella", "theresa",
  "diana", "natalie", "brittany", "charlotte", "marie", "kayla", "alexis", "lori", "tiffany", "crystal",
  "ava", "mia", "harper", "abby", "chloe", "ella", "avery", "scarlett", "madeline", "zoey",
  "penelope", "layla", "riley", "nora", "lily", "eleanor", "hazel", "aubrey", "addison", "brooklyn",
];
