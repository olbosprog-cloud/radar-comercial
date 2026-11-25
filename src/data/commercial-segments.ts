export interface CommercialActivity {
  id: string;
  nome: string;
  cnae: string;
  cnae_descricao: string;
  palavras_chave: string[];
}

export interface CommercialSegment {
  id: string;
  nome: string;
  icone: string;
  descricao: string;
  atividades: CommercialActivity[];
}

export const COMMERCIAL_SEGMENTS: CommercialSegment[] = [
  {
    id: 'MATERIAIS_CONSTRUCAO',
    nome: 'Materiais de Construção & Ferragens',
    icone: 'hammer',
    descricao: 'Lojas de materiais elétricos, hidráulicos, ferragens, tintas e acabamento',
    atividades: [
      {
        id: 'ferragens_ferramentas',
        nome: 'Casa de Ferragens & Ferramentas',
        cnae: '4744-0/01',
        cnae_descricao: 'Comércio varejista de ferragens e ferramentas',
        palavras_chave: ['ferragens', 'ferramentas', 'parafusos', 'abrasivos', 'casa das ferragens'],
      },
      {
        id: 'loja_tintas',
        nome: 'Lojas de Tintas & Vernizes',
        cnae: '4741-5/00',
        cnae_descricao: 'Comércio varejista de tintas e materiais para pintura',
        palavras_chave: ['tintas', 'vernizes', 'pintura imobiliária', 'impermeabilizantes', 'loja de tintas'],
      },
      {
        id: 'material_eletrico',
        nome: 'Material Elétrico & Iluminação',
        cnae: '4742-3/00',
        cnae_descricao: 'Comércio varejista de material elétrico',
        palavras_chave: ['material elétrico', 'iluminação', 'cabos e fios', 'disjuntores', 'lustres'],
      },
      {
        id: 'material_hidraulico',
        nome: 'Material Hidráulico & Tubos',
        cnae: '4744-0/03',
        cnae_descricao: 'Comércio varejista de materiais hidráulicos',
        palavras_chave: ['tubos e conexões', 'hidráulica', 'torneiras', 'registros', 'caixas d água'],
      },
      {
        id: 'madeireiras_esquadrias',
        nome: 'Madeireiras & Esquadrias',
        cnae: '4744-0/02',
        cnae_descricao: 'Comércio varejista de madeira e artefatos',
        palavras_chave: ['madeireira', 'madeiras', 'portas e janelas', 'compensados', 'vigas'],
      },
      {
        id: 'vidracarias',
        nome: 'Vidraçarias & Box',
        cnae: '4743-1/00',
        cnae_descricao: 'Comércio varejista de vidros',
        palavras_chave: ['vidraçaria', 'box de vidro', 'espelhos', 'vidros temperados'],
      },
      {
        id: 'deposito_geral',
        nome: 'Depósito Geral de Construção',
        cnae: '4744-0/99',
        cnae_descricao: 'Comércio varejista de materiais de construção em geral',
        palavras_chave: ['depósito de materiais', 'cimento', 'areia e brita', 'tijolos', 'construção'],
      },
    ],
  },
  {
    id: 'MODA_VESTUARIO',
    nome: 'Moda, Roupas & Calçados',
    icone: 'shirt',
    descricao: 'Lojas de roupas femininas, masculinas, calçados e confecções',
    atividades: [
      {
        id: 'moda_feminina',
        nome: 'Boutique & Moda Feminina',
        cnae: '4781-0/00',
        cnae_descricao: 'Comércio varejista de artigos do vestuário e acessórios',
        palavras_chave: ['boutique', 'moda feminina', 'vestidos', 'blusas', 'loja de roupas'],
      },
      {
        id: 'calcados_bolsas',
        nome: 'Sapatarias & Lojas de Calçados',
        cnae: '4782-8/00',
        cnae_descricao: 'Comércio varejista de calçados e artigos de viagem',
        palavras_chave: ['calçados', 'sapatos', 'tênis', 'sandálias', 'bolsas'],
      },
      {
        id: 'moda_masculina',
        nome: 'Moda Masculina & Streetwear',
        cnae: '4781-0/00',
        cnae_descricao: 'Comércio varejista de vestuário masculino',
        palavras_chave: ['moda masculina', 'camisaria', 'streetwear', 'bermudas', 'calças'],
      },
      {
        id: 'moda_infantil',
        nome: 'Moda Infantil & Bebê',
        cnae: '4781-0/00',
        cnae_descricao: 'Comércio varejista de artigos infantis e roupas',
        palavras_chave: ['roupa infantil', 'moda bebê', 'enxoval', 'kids', 'infantojuvenil'],
      },
      {
        id: 'moda_praia_fitness',
        nome: 'Moda Fitness & Praia',
        cnae: '4781-0/00',
        cnae_descricao: 'Comércio varejista de vestuário esportivo e praia',
        palavras_chave: ['moda fitness', 'biquínis', 'legging', 'academia', 'moda praia'],
      },
      {
        id: 'bijuterias_acessorios',
        nome: 'Bijuterias, Bolsas & Acessórios',
        cnae: '4789-0/01',
        cnae_descricao: 'Comércio varejista de suvenires, bijuterias e artesanatos',
        palavras_chave: ['bijuterias', 'folheados', 'acessórios', 'cintos', 'bolsas'],
      },
    ],
  },
  {
    id: 'ALIMENTOS_SUPERMERCADOS',
    nome: 'Supermercados & Alimentos',
    icone: 'shopping-cart',
    descricao: 'Mercearias de bairro, minimercados, empórios, hortifrútis e açougues',
    atividades: [
      {
        id: 'minimercados_mercearias',
        nome: 'Minimercados & Mercearias de Bairro',
        cnae: '4711-3/02',
        cnae_descricao: 'Comércio varejista de mercadorias em geral - minimercados',
        palavras_chave: ['minimercado', 'mercearia', 'mercado da vila', 'empório', 'armazém'],
      },
      {
        id: 'supermercados',
        nome: 'Supermercados & Hipermercados',
        cnae: '4711-3/01',
        cnae_descricao: 'Comércio varejista de mercadorias em geral - supermercados',
        palavras_chave: ['supermercado', 'rede de supermercados', 'varejão'],
      },
      {
        id: 'acougues_carnes',
        nome: 'Açougues & Casas de Carnes',
        cnae: '4722-9/01',
        cnae_descricao: 'Comércio varejista de carnes - açougues',
        palavras_chave: ['açougue', 'casa de carnes', 'boutique de carnes', 'cortes nobres'],
      },
      {
        id: 'padarias_confeitarias',
        nome: 'Padarias & Confeitarias',
        cnae: '4721-1/02',
        cnae_descricao: 'Padaria e confeitaria com predominância de revenda',
        palavras_chave: ['padaria', 'panificadora', 'confeitaria', 'pães e doces'],
      },
      {
        id: 'distribuidoras_bebidas',
        nome: 'Distribuidoras de Bebidas & Depósitos',
        cnae: '4723-7/00',
        cnae_descricao: 'Comércio varejista de bebidas',
        palavras_chave: ['distribuidora de bebidas', 'depósito de bebidas', 'cervejaria', 'gelo e carvão'],
      },
      {
        id: 'hortifruti_verdurao',
        nome: 'Hortifrúti, Varejão & Feirões',
        cnae: '4724-5/00',
        cnae_descricao: 'Comércio varejista de hortifrutigranjeiros',
        palavras_chave: ['hortifrúti', 'verdurão', 'sacolão', 'frutaria', 'feira'],
      },
    ],
  },
  {
    id: 'FARMACIAS_SAUDE',
    nome: 'Farmácias, Saúde & Cosméticos',
    icone: 'pill',
    descricao: 'Drogarias, perfumarias, produtos naturais e suplementos',
    atividades: [
      {
        id: 'farmacias_drogarias',
        nome: 'Farmácias & Drogarias',
        cnae: '4771-7/01',
        cnae_descricao: 'Comércio varejista de produtos farmacêuticos sem manipulação',
        palavras_chave: ['farmácia', 'drogaria', 'farma', 'remédios', 'medicamentos'],
      },
      {
        id: 'perfumarias_cosmeticos',
        nome: 'Perfumarias & Cosméticos',
        cnae: '4772-5/00',
        cnae_descricao: 'Comércio varejista de cosméticos, produtos de perfumaria e de higiene pessoal',
        palavras_chave: ['perfumaria', 'cosméticos', 'maquiagem', 'higiene pessoal', 'beleza'],
      },
      {
        id: 'produtos_naturais_suplementos',
        nome: 'Produtos Naturais & Suplementos',
        cnae: '4729-6/99',
        cnae_descricao: 'Comércio varejista de produtos alimentícios naturais e suplementos',
        palavras_chave: ['produtos naturais', 'suplementos', 'vida saudável', 'grãos e ervas'],
      },
      {
        id: 'oticas',
        nome: 'Óticas & Relojoarias',
        cnae: '4774-1/00',
        cnae_descricao: 'Comércio varejista de artigos de óptica',
        palavras_chave: ['ótica', 'óculos de grau', 'armações', 'óculos de sol', 'lentes'],
      },
    ],
  },
  {
    id: 'AUTOMOTIVO',
    nome: 'Autopeças & Serviços Automotivos',
    icone: 'car',
    descricao: 'Autopeças, motopeças, centros automotivos, pneus e oficinas',
    atividades: [
      {
        id: 'autopecas_carros',
        nome: 'Autopeças para Veículos Leves',
        cnae: '4530-7/03',
        cnae_descricao: 'Comércio a varejo de peças e acessórios novos para veículos automotores',
        palavras_chave: ['autopeças', 'peças automotivas', 'suspensão', 'freios', 'motor'],
      },
      {
        id: 'motopecas',
        nome: 'Motopeças & Acessórios de Moto',
        cnae: '4541-2/06',
        cnae_descricao: 'Comércio a varejo de peças e acessórios para motocicletas e motonetas',
        palavras_chave: ['motopeças', 'peças para motos', 'capacetes', 'escapamentos'],
      },
      {
        id: 'pneus_borracharias',
        nome: 'Lojas de Pneus & Centros de Rodas',
        cnae: '4530-7/05',
        cnae_descricao: 'Comércio a varejo de pneumáticos e câmaras-de-ar',
        palavras_chave: ['pneus', 'borracharia', 'rodas esportivas', 'alinhamento'],
      },
      {
        id: 'oficinas_mecanicas',
        nome: 'Oficinas Mecânicas & Centros Automotivos',
        cnae: '4520-0/01',
        cnae_descricao: 'Serviços de manutenção e reparação mecânica de veículos automotores',
        palavras_chave: ['oficina mecânica', 'centro automotivo', 'auto center', 'revisão'],
      },
      {
        id: 'som_acessorios',
        nome: 'Som Automotivo, Acessórios & Insulfilm',
        cnae: '4530-7/03',
        cnae_descricao: 'Comércio a varejo de acessórios para veículos automotores',
        palavras_chave: ['som automotivo', 'insulfilm', 'alarmes', 'engates', 'alto-falantes'],
      },
    ],
  },
  {
    id: 'GASTRONOMIA_RESTAURANTES',
    nome: 'Bares, Restaurantes & Lanchonetes',
    icone: 'utensils',
    descricao: 'Restaurantes, hamburguerias, pizzarias, bares e lanchonetes',
    atividades: [
      {
        id: 'restaurantes_selfservice',
        nome: 'Restaurantes & Self-Service',
        cnae: '5611-2/01',
        cnae_descricao: 'Restaurantes e similares',
        palavras_chave: ['restaurante', 'almoço', 'self service', 'comida por quilo'],
      },
      {
        id: 'lanchonetes_hamburguerias',
        nome: 'Lanchonetes, Hamburguerias & Fast Food',
        cnae: '5611-2/03',
        cnae_descricao: 'Lanchonetes, casas de chá, de sucos e similares',
        palavras_chave: ['lanchonete', 'hamburgueria', 'pastelaria', 'sucos e lanches', 'sanduíches'],
      },
      {
        id: 'pizzarias',
        nome: 'Pizzarias & Fornerias',
        cnae: '5611-2/01',
        cnae_descricao: 'Restaurantes e similares (pizzarias)',
        palavras_chave: ['pizzaria', 'pizza delivery', 'rodízio de pizza'],
      },
      {
        id: 'bares_petiscarias',
        nome: 'Bares, Botecos & Petiscarias',
        cnae: '5611-2/02',
        cnae_descricao: 'Bares e outros estabelecimentos especializados em servir bebidas',
        palavras_chave: ['bar', 'boteco', 'petiscaria', 'choperia', 'espetinho'],
      },
      {
        id: 'sorveterias_acai',
        nome: 'Sorveterias & Casas de Açaí',
        cnae: '5611-2/03',
        cnae_descricao: 'Sorveterias, casas de açaí e sobremesas',
        palavras_chave: ['sorveteria', 'açaí', 'gelato', 'picolé'],
      },
    ],
  },
  {
    id: 'MOVEIS_ELETRO',
    nome: 'Móveis, Eletrodomésticos & Bazar',
    icone: 'sofa',
    descricao: 'Móveis, colchões, eletrodomésticos e utilidades domésticas',
    atividades: [
      {
        id: 'moveis_colchoes',
        nome: 'Lojas de Móveis & Colchões',
        cnae: '4754-7/01',
        cnae_descricao: 'Comércio varejista de móveis',
        palavras_chave: ['móveis', 'colchões', 'sofás', 'guarda-roupas', 'mesa e cadeiras'],
      },
      {
        id: 'eletrodomesticos',
        nome: 'Eletrodomésticos & Aparelhos Eletrônicos',
        cnae: '4753-9/00',
        cnae_descricao: 'Comércio varejista especializado de eletrodomésticos e equipamentos de áudio e vídeo',
        palavras_chave: ['eletrodomésticos', 'geladeiras', 'fogões', 'televisores'],
      },
      {
        id: 'utilidades_bazar',
        nome: 'Utilidades Domésticas, Plásticos & Bazar',
        cnae: '4759-8/99',
        cnae_descricao: 'Comércio varejista de outros artigos de uso doméstico',
        palavras_chave: ['utilidades domésticas', 'bazar', 'plásticos', 'panelas', 'organização'],
      },
      {
        id: 'cama_mesa_banho',
        nome: 'Cama, Mesa, Banho & Cortinas',
        cnae: '4755-5/03',
        cnae_descricao: 'Comércio varejista de artigos de cama, mesa e banho',
        palavras_chave: ['cama mesa e banho', 'lençóis', 'cortinas', 'tapetes', 'toalhas'],
      },
    ],
  },
  {
    id: 'PET_AGRO',
    nome: 'Pet Shop, Rações & Veterinária',
    icone: 'dog',
    descricao: 'Pet shops, casas de ração, clínicas veterinárias e jardinagem',
    atividades: [
      {
        id: 'pet_shop_racoes',
        nome: 'Pet Shops & Casas de Ração',
        cnae: '4789-0/04',
        cnae_descricao: 'Comércio varejista de animais vivos e de artigos e alimentos para animais de estimação',
        palavras_chave: ['pet shop', 'casa de ração', 'alimentos para cães e gatos', 'acessórios pet', 'banho e tosa'],
      },
      {
        id: 'clinicas_veterinarias',
        nome: 'Clínicas Veterinárias & Consultórios',
        cnae: '7500-1/00',
        cnae_descricao: 'Atividades veterinárias',
        palavras_chave: ['veterinária', 'clínica veterinária', 'hospital veterinário'],
      },
      {
        id: 'agropecuaria_jardinagem',
        nome: 'Agropecuária, Plantas & Jardinagem',
        cnae: '4789-0/02',
        cnae_descricao: 'Comércio varejista de plantas e flores naturais e artigos agropecuários',
        palavras_chave: ['agropecuária', 'sementes', 'adubos', 'jardinagem', 'mudas'],
      },
    ],
  },
  {
    id: 'TECNOLOGIA_PAPELARIA',
    nome: 'Informática, Celulares & Papelaria',
    icone: 'laptop',
    descricao: 'Lojas de celulares, assistência técnica, informática e papelaria',
    atividades: [
      {
        id: 'celulares_acessorios',
        nome: 'Lojas de Celulares & Acessórios',
        cnae: '4752-1/00',
        cnae_descricao: 'Comércio varejista especializado de equipamentos de telefonia e comunicação',
        palavras_chave: ['celulares', 'capinhas e películas', 'acessórios para celular', 'carregadores'],
      },
      {
        id: 'informatica_assistencia',
        nome: 'Informática & Assistência Técnica',
        cnae: '4751-2/01',
        cnae_descricao: 'Comércio varejista especializado de equipamentos e suprimentos de informática',
        palavras_chave: ['informática', 'computadores', 'notebooks', 'assistência técnica', 'impressoras'],
      },
      {
        id: 'papelaria_armarinhos',
        nome: 'Papelarias, Livrarias & Armarinhos',
        cnae: '4761-0/03',
        cnae_descricao: 'Comércio varejista de artigos de papelaria',
        palavras_chave: ['papelaria', 'material escolar', 'armarinho', 'aviamentos', 'xerox e cópias'],
      },
    ],
  },
];
