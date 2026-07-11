export type BacSection =
  | 'MATHEMATIQUES'
  | 'SCIENCES_EXPERIMENTALES'
  | 'TECHNIQUE'
  | 'LETTRES'
  | 'ECONOMIE_GESTION'
  | 'INFORMATIQUE'
  | 'SPORT'

export const DEFAULT_BAC_SECTION: BacSection = 'SCIENCES_EXPERIMENTALES'

export const BAC_SECTION_OPTIONS: Array<{ value: BacSection; label: string }> = [
  { value: 'MATHEMATIQUES', label: 'Bac Mathematiques' },
  { value: 'SCIENCES_EXPERIMENTALES', label: 'Bac Sciences Experimentales' },
  { value: 'TECHNIQUE', label: 'Bac Technique' },
  { value: 'LETTRES', label: 'Bac Lettres' },
  { value: 'ECONOMIE_GESTION', label: 'Bac Economie & Gestion' },
  { value: 'INFORMATIQUE', label: 'Bac Informatique' },
  { value: 'SPORT', label: 'Bac Sport' },
]

export const BAC_SECTION_LABELS = BAC_SECTION_OPTIONS.reduce<Record<BacSection, string>>(
  (accumulator, option) => {
    accumulator[option.value] = option.label
    return accumulator
  },
  {
    MATHEMATIQUES: 'Bac Mathematiques',
    SCIENCES_EXPERIMENTALES: 'Bac Sciences Experimentales',
    TECHNIQUE: 'Bac Technique',
    LETTRES: 'Bac Lettres',
    ECONOMIE_GESTION: 'Bac Economie & Gestion',
    INFORMATIQUE: 'Bac Informatique',
    SPORT: 'Bac Sport',
  }
)
