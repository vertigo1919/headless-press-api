const db = require("../connection")

const seed = ({ topicData, userData, articleData, commentData }) => {
  return db.query(); //<< write your first query in here.
};
module.exports = seed;
