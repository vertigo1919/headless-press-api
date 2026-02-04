const db = require("../connection");
const format = require("pg-format");
const {
  mapToNestedArray,
  convertDateToISOString,
  createLookupMap,
} = require("./utils");
const comments = require("../data/development-data/comments");

const seed = async ({ topicData, userData, articleData, commentData }) => {
  /*STEP 1
DROP tables in reverse order to ensure idempotency (in comparison to creation order below)
We drop them in reverse because a parent table cannot be deleted while its
PK is still being referenced by a FK in a child table */

  await db.query(/* SQL */ `
    DROP TABLE IF EXISTS comments;
    DROP TABLE IF EXISTS articles;
    DROP TABLE IF EXISTS topics;
    DROP TABLE IF EXISTS users;`);

  /*STEP 2
CREATE TABLES starting with parents because children cannot be created
until their FKs have the PKs to validate against*/

  await db.query(
    /* SQL */
    `CREATE TABLE users (
      username VARCHAR NOT NULL, 
      name VARCHAR NOT NULL, 
      avatar_url VARCHAR(1000), 
      CONSTRAINT pk_users PRIMARY KEY (username));`
  );

  await db.query(
    /* SQL */
    `CREATE TABLE topics (
      slug VARCHAR, 
      description VARCHAR NOT NULL, 
      img_url VARCHAR(1000), 
      CONSTRAINT pk_slug PRIMARY KEY (slug));`
  );

  await db.query(
    /* SQL */
    `CREATE TABLE articles (
      article_id SERIAL, 
      title VARCHAR NOT NULL, 
      topic VARCHAR NOT NULL, 
      author VARCHAR NOT NULL, 
      body TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      votes INT DEFAULT 0,
      article_img_url VARCHAR(1000),
      CONSTRAINT pk_article_id PRIMARY KEY (article_id),
      CONSTRAINT fk_topic FOREIGN KEY (topic) REFERENCES topics(slug),
      CONSTRAINT fk_articles_author FOREIGN KEY (author) REFERENCES users(username));`
  );

  await db.query(
    /* SQL */
    `CREATE TABLE comments (
      comment_id SERIAL, 
      article_id INT NOT NULL, 
      body TEXT NOT NULL, 
      votes INT DEFAULT 0, 
      author VARCHAR NOT NULL, 
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
      CONSTRAINT pk_comment_id PRIMARY KEY (comment_id),
      CONSTRAINT fk_article_id FOREIGN KEY (article_id) REFERENCES articles(article_id),
      CONSTRAINT fk_comment_author FOREIGN KEY (author) REFERENCES users(username));`
  );

  /*STEP 3
INSERTION*/

  // 1- USERS TABLE

  // delete any pre-existing data? we are already deleting tables in this file so no need.

  // prep the data in pg-format friendly format
  const usersValuesArray = mapToNestedArray(userData, [
    "username",
    "name",
    "avatar_url",
  ]);

  // generate the SQL string
  const insertUserSQL = format(
    "INSERT INTO users (username, name, avatar_url) VALUES %L",
    usersValuesArray
  );
  // run the SQL code
  await db.query(insertUserSQL);

  // 2 - TOPICS TABLE

  // prep the data in pg-format friendly format
  const topicsValuesArray = mapToNestedArray(topicData, [
    "slug",
    "description",
    "img_url",
  ]);

  // generate the SQL string
  const insertTopicsSQL = format(
    "INSERT INTO topics (slug, description, img_url) VALUES %L",
    topicsValuesArray
  );

  // run the SQL code
  await db.query(insertTopicsSQL);

  // 3 - ARTICLES TABLE
  // convert timestamp to ISO string, no need to clone object because my util function uses the spread operator so alrady creates a new object
  const formattedArticleData = articleData.map(convertDateToISOString);

  // prep the data in pg-format friendly format
  const articlesValuesArray = mapToNestedArray(formattedArticleData, [
    "title",
    "topic",
    "author",
    "body",
    "created_at",
    "votes",
    "article_img_url",
  ]);

  // generate the SQL string
  const insertArticlesSQL = format(
    "INSERT INTO articles (title, topic, author, body, created_at, votes, article_img_url) VALUES %L",
    articlesValuesArray
  );

  // run the SQL code
  await db.query(insertArticlesSQL);

  // 4 - COMMENTS TABLE

  // sort timestamp
  const formattedCommentsData = commentData.map(convertDateToISOString);

  // create array of array
  const commentsValuesArray = mapToNestedArray(formattedCommentsData, [
    "article_title",
    "body",
    "votes",
    "author",
    "created_at",
  ]);

  //create look-up object to associate article title to article id - like a dictionary
  // we want to reduce an array of objects (the rows of articles) to a single lookup object with the format
  // title:title_id > my util lookup does this

  const articleRows = (await db.query("SELECT * FROM articles")).rows;

  const articlesLookUpObject = createLookupMap(
    articleRows,
    "title",
    "article_id"
  );

  // swap article_title with article_id
  commentsValuesArray.forEach(
    (element) => (element[0] = articlesLookUpObject[element[0]])
  );

  // generate the SQL string
  const insertCommentsSQL = format(
    "INSERT INTO comments (article_id, body, votes, author, created_at) VALUES %L",
    commentsValuesArray
  );

  // run the SQL code
  await db.query(insertCommentsSQL);
};

module.exports = seed;
