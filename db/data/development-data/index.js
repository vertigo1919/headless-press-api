exports.articleData = require("./articles.js");
exports.commentData = require("./comments.js");
exports.topicData = require("./topics.js");
exports.userData = require("./users.js");

async function getAnimals() {
  try {
    await pool.query("SELECT * FROM animals;");
  } catch (err) {
    console.error("Database Error: ", err);
  }
}
