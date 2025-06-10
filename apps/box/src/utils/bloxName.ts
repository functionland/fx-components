// Utility to generate a unique Blox name
export function generateUniqueBloxName(baseName: string, existingNames: string[]): string {
  let name = baseName;
  let counter = 1;
  while (existingNames.includes(name)) {
    name = `${baseName} (${counter})`;
    counter++;
  }
  return name;
}
