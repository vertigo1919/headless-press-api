//Convert the array of objests into an array of arrays with keys removed
function mapToNestedArray(arrayOfObjects, propertiesArray) {
  const arrayClone = structuredClone(arrayOfObjects);

  return arrayClone.map((object) => {
    let array = [];
    propertiesArray.forEach((element) => {
      array.push(object[element]);
    });
    return array;
  });
}

// fixes timestamp format
convertDateToISOString = ({ created_at, ...otherProperties }) => {
  if (!created_at) return { ...otherProperties };

  return {
    ...otherProperties,
    created_at: new Date(created_at).toISOString(),
  };
};

// reduces and array of object to a lookup object based on a key and value
function createLookupMap(arrayOfObjects, key, value) {
  return arrayOfObjects.reduce((lookupObject, element) => {
    lookupObject[element[key]] = element[value];
    return lookupObject;
  }, {});
}
module.exports = { mapToNestedArray, convertDateToISOString, createLookupMap };
