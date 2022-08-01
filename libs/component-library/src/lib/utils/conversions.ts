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

export { convertMegabyteToGigabyte, convertPascalToSentence };
