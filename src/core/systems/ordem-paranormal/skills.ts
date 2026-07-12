// Atributos e perícias de Ordem Paranormal.

export const ATTRIBUTES = ['agi', 'for', 'int', 'pre', 'vig'] as const
export type AttributeId = (typeof ATTRIBUTES)[number]

export const ATTRIBUTE_NAMES: Record<AttributeId, string> = {
  agi: 'Agilidade',
  for: 'Força',
  int: 'Intelecto',
  pre: 'Presença',
  vig: 'Vigor',
}

export const SKILLS = {
  acrobacia: { name: 'Acrobacia', attribute: 'agi' },
  adestramento: { name: 'Adestramento', attribute: 'pre' },
  artes: { name: 'Artes', attribute: 'pre' },
  atletismo: { name: 'Atletismo', attribute: 'for' },
  atualidades: { name: 'Atualidades', attribute: 'int' },
  ciencias: { name: 'Ciências', attribute: 'int' },
  crime: { name: 'Crime', attribute: 'agi' },
  diplomacia: { name: 'Diplomacia', attribute: 'pre' },
  enganacao: { name: 'Enganação', attribute: 'pre' },
  fortitude: { name: 'Fortitude', attribute: 'vig' },
  furtividade: { name: 'Furtividade', attribute: 'agi' },
  iniciativa: { name: 'Iniciativa', attribute: 'agi' },
  intimidacao: { name: 'Intimidação', attribute: 'pre' },
  intuicao: { name: 'Intuição', attribute: 'pre' },
  investigacao: { name: 'Investigação', attribute: 'int' },
  luta: { name: 'Luta', attribute: 'for' },
  medicina: { name: 'Medicina', attribute: 'int' },
  ocultismo: { name: 'Ocultismo', attribute: 'int' },
  percepcao: { name: 'Percepção', attribute: 'pre' },
  pilotagem: { name: 'Pilotagem', attribute: 'agi' },
  pontaria: { name: 'Pontaria', attribute: 'agi' },
  profissao: { name: 'Profissão', attribute: 'int' },
  reflexos: { name: 'Reflexos', attribute: 'agi' },
  religiao: { name: 'Religião', attribute: 'pre' },
  sobrevivencia: { name: 'Sobrevivência', attribute: 'int' },
  tatica: { name: 'Tática', attribute: 'int' },
  tecnologia: { name: 'Tecnologia', attribute: 'int' },
  vontade: { name: 'Vontade', attribute: 'pre' },
} as const satisfies Record<string, { name: string; attribute: AttributeId }>

export type SkillId = keyof typeof SKILLS
export const SKILL_IDS = Object.keys(SKILLS) as SkillId[]

export const SKILL_GRADES = ['destreinado', 'treinado', 'veterano', 'expert'] as const
export type SkillGrade = (typeof SKILL_GRADES)[number]

export const SKILL_GRADE_BONUS: Record<SkillGrade, number> = {
  destreinado: 0,
  treinado: 5,
  veterano: 10,
  expert: 15,
}
