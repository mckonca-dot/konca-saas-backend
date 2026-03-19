export const slugify = (text: string): string => {
  const trMap = {
    'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u',
    'Ç': 'c', 'Ğ': 'g', 'İ': 'i', 'Ö': 'o', 'Ş': 's', 'Ü': 'u'
  };
  
  let slug = text;
  for (const key in trMap) {
    slug = slug.replace(new RegExp(key, 'g'), trMap[key]);
  }

  return slug
    .toLowerCase()
    .replace(/[^\w ]+/g, '') // Özel karakterleri sil
    .replace(/ +/g, '-')     // Boşlukları tire yap
    .trim();
};