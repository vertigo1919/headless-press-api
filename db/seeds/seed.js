const db = require("../connection");

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
};

module.exports = seed;
