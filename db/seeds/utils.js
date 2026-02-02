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

convertDateToISOString = ({ created_at, ...otherProperties }) => {
  if (!created_at) return { ...otherProperties };

  return {
    ...otherProperties,
    created_at: new Date(created_at).toISOString(),
  };
};

module.exports = { mapToNestedArray, convertDateToISOString };
// quick test
// let test = [
//   {
//     username: "tickle122",
//     name: "Tom Tickle",
//     avatar_url:
//       "https://vignette.wikia.nocookie.net/mrmen/images/d/d6/Mr-Tickle-9a.png/revision/latest?cb=20180127221953",
//   },
//   {
//     username: "grumpy19",
//     name: "Paul Grump",
//     avatar_url:
//       "https://vignette.wikia.nocookie.net/mrmen/images/7/78/Mr-Grumpy-3A.PNG/revision/latest?cb=20170707233013",
//   },
// ];

// console.log(mapToNestedArray(test, ["username", "name", "avatar_url"]));
