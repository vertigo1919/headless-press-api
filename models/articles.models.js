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
    SELECT articles.author, articles.title, articles.article_id, articles.topic, articles.created_at, articles.votes, articles.article_img_url, articles.body, 
    COUNT(comments.comment_id)::INT AS comment_count, 
    topics.img_url AS topic_img_url,
      users.avatar_url AS author_avatar_url
    FROM articles 
    LEFT JOIN comments ON articles.article_id = comments.article_id
    LEFT JOIN topics ON articles.topic = topics.slug
    LEFT JOIN users ON articles.author = users.username
  `;

  if (topic) {
    queryStr += ` WHERE articles.topic = $1`;
    queryValues.push(topic);
  }

  queryStr += ` GROUP BY articles.article_id, topics.img_url, users.avatar_url ORDER BY ${sort_by} ${order};`;

  const dbQuery = db.query(queryStr, queryValues);

  // If a topic is requested, we must double-check it exists if no articles are found
  if (topic) {
    return Promise.all([dbQuery, checkExists("topics", "slug", topic)]).then(
      ([dbResult]) => dbResult.rows
    );
  }

  return dbQuery.then(({ rows }) => rows);
};

exports.selectArticleById = async (article_id, username) => {
  const { rows } = await db.query(
    `SELECT 
        articles.*,
        COUNT(comments.comment_id)::INT AS comment_count,
        topics.img_url                  AS topic_img_url,
        users.avatar_url                AS author_avatar_url,
        av.vote_value                   AS user_vote
     FROM articles
     LEFT JOIN comments     ON articles.article_id = comments.article_id
     LEFT JOIN topics       ON articles.topic = topics.slug
     LEFT JOIN users        ON articles.author = users.username
     LEFT JOIN article_votes av  
                            ON av.article_id = articles.article_id 
                            AND av.username = $2
     WHERE articles.article_id = $1
     GROUP BY 
        articles.article_id, 
        topics.img_url, 
        users.avatar_url, 
        av.vote_value`,
    [article_id, username]
  );

  if (rows.length === 0) {
    return Promise.reject({ status: 404, msg: "Article not found" });
  }

  const article = rows[0];
  article.user_vote = article.user_vote ?? 0;

  return article;
};

exports.updateArticle = async (article_id, inc_votes, username) => {
  // 1. Check if this user has already voted on this article
  const { rows: existingVoteRows } = await db.query(
    `SELECT vote_value 
     FROM article_votes 
     WHERE username = $1 AND article_id = $2`,
    [username, article_id]
  );

  const existingVote = existingVoteRows[0]?.vote_value ?? 0;

  // 2. Work out what the new vote state should be
  //    If the user clicks the same direction they already voted, it's an un-vote (0)
  //    Otherwise it's a new vote or a flip
  const newVote = existingVote === inc_votes ? 0 : inc_votes;
  const trueDelta = newVote - existingVote;

  // 3. Update the article_votes table
  //    Un-vote = delete the row entirely
  //    Vote/flip = upsert (insert or update if row already exists)
  if (newVote === 0) {
    await db.query(
      `DELETE FROM article_votes 
       WHERE username = $1 AND article_id = $2`,
      [username, article_id]
    );
  } else {
    await db.query(
      `INSERT INTO article_votes (username, article_id, vote_value)
       VALUES ($1, $2, $3)
       ON CONFLICT (username, article_id) DO UPDATE 
         SET vote_value = $3`,
      [username, article_id, newVote]
    );
  }

  // 4. Apply the  delta to the article's vote count and return the updated article
  const { rows: updatedArticleRows } = await db.query(
    `UPDATE articles 
     SET votes = votes + $1 
     WHERE article_id = $2 
     RETURNING *`,
    [trueDelta, article_id]
  );

  if (updatedArticleRows.length === 0) {
    return Promise.reject({ status: 404, msg: "Article not found" });
  }

  return updatedArticleRows[0];
};

exports.selectCommentsByArticleId = (article_id, username) => {
  return checkExists("articles", "article_id", article_id)
    .then(() => {
      return db.query(
        `
        SELECT 
          comments.*, 
          users.avatar_url AS author_avatar_url,
          cv.vote_value AS user_vote
        FROM comments 
        JOIN users ON comments.author = users.username
        LEFT JOIN comment_votes cv
          ON cv.comment_id = comments.comment_id
          AND cv.username = $2
        WHERE comments.article_id = $1 
        ORDER BY comments.created_at DESC;
      `,
        [article_id, username]
      );
    })
    .then(({ rows }) => {
      return rows.map((row) => ({
        ...row,
        user_vote: row.user_vote ?? 0,
      }));
    });
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
