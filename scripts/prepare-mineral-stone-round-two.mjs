import fs from 'node:fs/promises';

const originalFile = 'docs/mineral-walnut-stone-studies.json';
const original = JSON.parse(await fs.readFile(originalFile, 'utf8'));
const feedback = {
  date: '2026-10-08',
  preferred: ['A', 'E'],
  exploreFurther: ['C', 'D'],
  note: 'A and E are preferred visual directions. C is liked but needs alternatives; D is acceptable but needs alternatives. No product, fabrication or whole-house implementation approval.',
};
const specs = [
  ['C1', 'C', 'Cream quartzite', 'A soft cream quartzite-look porcelain across the backsplash, worktops and waterfall end.', 'The quietest coordinated kitchen: fine mineral movement lets walnut and lighting lead.', 'Replace backsplash, worktops and existing island top/waterfall with warm cream QUARTZITE-LOOK PORCELAIN: delicate ivory crystalline depth, hairline taupe wisps and fine diffuse lengthwise ribbons, low contrast and satin honed appearance. Absolutely no bold diagonal marble veins, no dark outlines and no gold veining. Backsplash continues only inside its existing footprint; preserve the mineral-painted wall around and above the left counter window. Keep island shape, thickness, overhang, sink and walnut front unchanged.'],
  ['C2', 'C', 'Marble focal backsplash', 'A more expressive warm marble-look backsplash paired with calm ivory worktops.', 'Concentrates the pattern on one plane while the island stays restful.', 'Replace ONLY the working backsplash between the cabinetry and worktop, including behind the existing hood, with ivory MARBLE-LOOK PORCELAIN showing a few broad softly feathered taupe-grey veins, medium visual contrast, beautiful but not black lightning or mirrored bookmatching. Keep the painted mineral wall around and above the left counter window. Change the worktops and existing island top/waterfall to very quiet solid warm-ivory porcelain with nearly invisible mineral speckle and no large veins. Distinct hierarchy: statement backsplash, calm island, rich walnut front. No removal of cabinets and no stone cladding on hood.'],
  ['C3', 'C', 'Soft limestone', 'Matte limestone-look backsplash with quiet ivory worktops and walnut below.', 'The most understated texture study; compare its matte surface with the veined options.', 'Replace working backsplash within its current footprint with large rectangular warm PALE LIMESTONE-LOOK porcelain tiles, creamy putty/ivory, subtle sediment and delicate fossil-like flecks, smooth matte finish and very fine warm matching joints. No diagonal marble veins, strong banding, mosaic, zellige or rustic roughness. Keep the painted mineral wall around/above the left counter window. Replace worktops and existing island top/waterfall with quiet pale ivory porcelain, satin-honed, very faint mineral mottling and no obvious veining. Preserve all walnut fronts and existing exact surface shapes.'],
  ['D1', 'D', 'Warm marble fireplace', 'Soft ivory marble-look porcelain across the existing fireplace and TV projection.', 'A little more movement and ceremony, contained within the central projection.', 'Apply warm ivory MARBLE-LOOK PORCELAIN only to the existing central projecting fireplace/TV chase from floor to crown. Sparse broad softly feathered taupe-grey diagonal veins, low-to-medium contrast. Large panels, fine matching joints. Do not create mirror bookmatching or dark lightning veins. Preserve the existing stepped projection, its full exact outline, width and depth; TV and fireplace positions unchanged. Side walls remain existing mineral paint. No cladding under side windows or behind consoles.'],
  ['D2', 'D', 'Pearl onyx fireplace', 'Cloudy pearl onyx-look porcelain echoes the preferred primary-bath material.', 'The more expressive option: compare its cloudy depth against the quieter surround.', 'Apply warm pearl ONYX-LOOK PORCELAIN only to the existing central projecting fireplace/TV chase, floor to crown, preserving its exact stepped outline. Broad cloudy translucent-looking layers in ivory, cream and pale mushroom; gentle mineral movement, no orange honey, blue grey, harsh bands or gold. Large panels with subtle aligned joints. It is opaque porcelain under normal daylight, NOT backlit stone. Keep TV and fireplace sizes, positions, existing projection depth and trim. Side walls and all other finishes unchanged.'],
  ['D3', 'D', 'Limestone lower surround', 'Stone only around the lower fireplace; the upper TV wall retains its soft mineral finish.', 'The most restrained coverage and a strong option for keeping the TV wall calm.', 'Apply warm pale LIMESTONE-LOOK PORCELAIN ONLY to the LOWER stepped fireplace projection, from floor to its existing horizontal upper edge beneath the TV. Smooth matte cream with tiny fossil-like flecks, almost no veins. Finish the narrow existing top return in the same stone with a fine flush edge. Keep the entire UPPER TV wall in its current warm ivory/mushroom mineral finish all the way to crown. Preserve the exact chase silhouette, width and depth and existing fireplace opening, metal trim and TV position. Do NOT add a mantle, shelf, hearth extension, slats or new border. This is a clearly two-surface treatment: stone lower, quiet mineral upper.'],
];
const requests = specs.map(([letter, parentLetter, title, summary, judgment, change], i) => {
  const source = original.requests.find(r => r.letter === parentLetter);
  const common = source.params.prompt.split('\n\nMATERIAL STUDY')[0];
  const geometry = parentLetter === 'C'
    ? 'Kitchen lock: four upholstered stools, two dark bronze dome pendants, ivory cabinets and glass uppers, walnut island front, natural oak floor, refrigerator at near left SHORT RETURN, left counter window, hood/cooktop on long wall, oven/microwave column at RIGHT END beside sunroom, unchanged sunroom table and glazing. Keep all furniture, accessories, plants and exterior views.'
    : 'Great-room lock: original flat ceiling and crown, both high horizontal transom windows flanking central chase, left terrace glazing and its transom, both walnut consoles with sibling black-framed art, ivory sofa and two oatmeal chairs, low oval walnut table, rugs and curtains. Preserve every opening, projection and object in reference 1.';
  return {
    index: 42001 + i, letter, parentLetter, room: source.room, title, summary, judgment,
    sourceFile: source.sourceFile, sourceJobId: source.sourceJobId, originalPhoto: source.originalPhoto,
    file: `assets/render-candidates/mineral-walnut-stone/r02/${letter.toLowerCase()}-${source.room}.png`,
    params: { ...source.params, medias: source.params.medias.slice(0, 2), prompt: `${common}\n\n${geometry}\n\nMATERIAL ALTERNATIVE ${letter}: ${change}\nCorrect any pink or magenta cast to balanced neutral architectural daylight; cream remains warm but not yellow. This is a material-only comparison: do not improve unrelated furnishing or architecture.` },
  };
});
await fs.mkdir('assets/render-candidates/mineral-walnut-stone/r02', { recursive: true });
await fs.mkdir('tmp/stone-studies/r02', { recursive: true });
await fs.writeFile('docs/mineral-walnut-stone-round-two.json', JSON.stringify({
  version: 'MW-S02', date: '2026-10-08', status: 'exploration_not_approved', provider: 'Higgsfield API',
  feedback, scope: 'Three kitchen alternatives and three great-room fireplace alternatives; A and E remain preferred studies. Current Option 1 gallery and construction specifications unchanged.',
  outputName: 'round-two-comparison', qaDirectory: 'tmp/stone-studies/r02', requests, jobs: [],
}, null, 2) + '\n', { flag: 'wx' });
original.feedback = feedback;
await fs.writeFile(originalFile, JSON.stringify(original, null, 2) + '\n');
console.log('Prepared six material alternatives and recorded preferences.');
