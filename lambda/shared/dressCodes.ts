// Minimal dress code clothing data for Lambda use — derived from src/data/dressCodes.ts
// Do not add UI/photo/women data here.

export const DRESS_CODE_ITEMS: Record<string, string[]> = {
  'white-tie': [
    'Black wool tailcoat with silk-faced lapels',
    'White piqué wing-collar dress shirt with white piqué waistcoat',
    'Black dress trousers with double silk braid down each leg',
    'White piqué bow tie',
    'White pocket square',
    'Cufflinks',
    'Patent leather Oxford or court shoe',
  ],
  'black-tie': [
    'Black wool or barathea dinner jacket with silk-faced lapels',
    'White dress shirt with pleated front or marcella bib',
    'Black dress trousers with single silk braid',
    'Black silk bow tie',
    'Black cummerbund or matching waistcoat',
    'Cufflinks and dress studs',
    'Black patent leather Oxford or pump',
  ],
  'black-tie-optional': [
    'Black dinner jacket or dark business suit',
    'White dress shirt or formal shirt',
    'Matching trousers',
    'Black bow tie or conservative necktie',
    'Leather Oxford or Derby shoe',
  ],
  'morning-dress': [
    'Morning coat or black tailcoat with tails',
    'Waistcoat in dove grey or buff',
    'Striped morning trousers',
    'Cravat or formal necktie',
    'Top hat (optional)',
    'Black Oxford shoe',
  ],
  'creative-black-tie': [
    'Dinner jacket — classic or statement (velvet, patterned, coloured)',
    'Formal or fashion-forward dress shirt',
    'Dress trousers matching jacket',
    'Statement bow tie or necktie',
    'Derby, Chelsea boot, or classic dress shoe',
  ],
  'cocktail': [
    'Dark suit jacket',
    'White or pale dress shirt',
    'Matching suit trousers',
    'Silk or quality necktie',
    'Black Oxford or Derby shoe',
  ],
  'lounge-suit': [
    'Tailored suit jacket',
    'Dress shirt — white, pale blue, or subtle pattern',
    'Matching suit trousers',
    'Leather belt matching shoes',
    'Oxford or Derby shoe',
  ],
  'business-formal': [
    'Dark conservative suit jacket (charcoal, navy, dark grey)',
    'White or light blue dress shirt',
    'Matching suit trousers',
    'Conservative silk necktie',
    'Black Oxford shoe',
  ],
  'business-casual': [
    'Blazer or smart sport coat',
    'Polo shirt or button-down shirt',
    'Chinos or pressed trousers (no jeans)',
    'Leather loafer, brogue, or Chelsea boot',
  ],
  'smart-casual': [
    'Blazer or structured jacket',
    'Quality shirt, polo, or fine-knit sweater',
    'Dark jeans, chinos, or casual trousers',
    'Smart leather trainer, loafer, or Chelsea boot',
  ],
  'resort-casual': [
    'Linen or lightweight casual shirt',
    'Linen, cotton, or linen-blend trousers or shorts',
    'Leather sandal or casual loafer',
  ],
  'casual': [
    'T-shirt, casual shirt, or lightweight sweater',
    'Jeans, chinos, or casual trousers',
    'Trainer, canvas shoe, or casual boot',
  ],
};
