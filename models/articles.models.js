const db = require("../db/connection");
const { checkExists } = require("../db/check-exists");

exports.selectArticles = (sort_by = "created_at", order = "desc", topic) => {
  const validSortColumns = [
    "article_id",
    "title",
    "topic",
    "author",
    "body",
    "created_at",
    "votes",
    "comment_count",
  ];
  const validOrders = ["asc", "desc"];

  if (!validSortColumns.includes(sort_by)) {
    return Promise.reject({ status: 400, msg: "Invalid sort_by column" });
  }
  if (!validOrders.includes(order)) {
    return Promise.reject({ status: 400, msg: "Invalid order" });
  }

  const queryValues = [];
  let queryStr = `
    SELECT articles.author, articles.title, articles.article_id, articles.topic, articles.created_at, articles.votes, articles.article_img_url, 
    COUNT(comments.comment_id)::INT AS comment_count 
    FROM articles 
    LEFT JOIN comments ON articles.article_id = comments.article_id
  `;

  if (topic) {
    queryStr += ` WHERE articles.topic = $1`;
    queryValues.push(topic);
  }

  queryStr += ` GROUP BY articles.article_id ORDER BY ${sort_by} ${order};`;

  const dbQuery = db.query(queryStr, queryValues);

  // If a topic is requested, we must double-check it exists if no articles are found
  if (topic) {
    return Promise.all([dbQuery, checkExists("topics", "slug", topic)]).then(
      ([dbResult]) => dbResult.rows
    );
  }

  return dbQuery.then(({ rows }) => rows);
};

exports.selectArticleById = (article_id) => {
  return db
    .query(
      `
    SELECT articles.*, COUNT(comments.comment_id)::INT AS comment_count 
    FROM articles 
    LEFT JOIN comments ON articles.article_id = comments.article_id
    WHERE articles.article_id = $1
    GROUP BY articles.article_id;
  `,
      [article_id]
    )
    .then(({ rows }) => {
      if (rows.length === 0) {
        return Promise.reject({ status: 404, msg: "Article not found" });
      }
      return rows[0];
    });
};

exports.updateArticle = (article_id, inc_votes) => {
  return db
    .query(
      `
    UPDATE articles 
    SET votes = votes + $1 
    WHERE article_id = $2 
    RETURNING *;
  `,
      [inc_votes, article_id]
    )
    .then(({ rows }) => {
      if (rows.length === 0) {
        return Promise.reject({ status: 404, msg: "Article not found" });
      }
      return rows[0];
    });
};

exports.selectCommentsByArticleId = (article_id) => {
  // Check if article exists first, then fetch comments
  return checkExists("articles", "article_id", article_id)
    .then(() => {
      return db.query(
        `
        SELECT * FROM comments 
        WHERE article_id = $1 
        ORDER BY created_at DESC;
      `,
        [article_id]
      );
    })
    .then(({ rows }) => rows);
};

exports.insertComment = (article_id, username, body) => {
  return db
    .query(
      `
    INSERT INTO comments (article_id, author, body) 
    VALUES ($1, $2, $3) 
    RETURNING *;
  `,
      [article_id, username, body]
    )
    .then(({ rows }) => {
      return rows[0];
    });
};
