const MEGABYTE_DECIMAL_CONSTANT = 1000;
const MEGABYTE_BINARY_CONSTANT = 1024;

const convertMegabyteToGigabyte = (megabytes: number, isBinary?: boolean) => {
  const constant = isBinary
    ? MEGABYTE_BINARY_CONSTANT
    : MEGABYTE_DECIMAL_CONSTANT;
  return parseFloat((megabytes / constant).toFixed(2));
};

const convertPascalToSentence = (str: string) => {
  const stringWithSpaces = str.replace(/([A-Z])/g, ' $1').slice(1);
  return stringWithSpaces.charAt(0) + stringWithSpaces.slice(1).toLowerCase();
};

function capitalizeFirstLetter(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
const convertByteToCapacityUnit = (bytes: number, isBinary?: boolean) => {
  const constant = isBinary
    ? MEGABYTE_BINARY_CONSTANT
    : MEGABYTE_DECIMAL_CONSTANT;
  const tera = bytes / (constant * 1000 * 1000 * 1000 * 1000);
  if (tera > 1) return tera.toFixed(2) + ' TB';
  const giga = bytes / (constant * 1000 * 1000 * 1000);
  if (giga > 1) return giga.toFixed(2) + ' GB';
  const mega = bytes / (constant * 1000 * 1000);
  if (mega > 1) return mega.toFixed(2) + ' MB';
  const kilo = bytes / (constant * 1000);
  return kilo.toFixed(2) + ' KB';
};
export {
  convertMegabyteToGigabyte,
  convertByteToCapacityUnit,
  convertPascalToSentence,
  capitalizeFirstLetter,
};
