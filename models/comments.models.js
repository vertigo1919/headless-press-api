const db = require("../db/connection");

exports.removeComment = (comment_id) => {
  return db
    .query("DELETE FROM comments WHERE comment_id = $1 RETURNING *;", [
      comment_id,
    ])
    .then(({ rows }) => {
      if (rows.length === 0) {
        return Promise.reject({ status: 404, msg: "Comment not found" });
      }
    });
};

exports.updateComment = async (comment_id, inc_votes, username) => {
  // 1. Get existing vote for this user+comment
  const { rows: existingVoteRows } = await db.query(
    `SELECT vote_value 
     FROM comment_votes 
     WHERE username = $1 AND comment_id = $2`,
    [username, comment_id]
  );

  const existingVote = existingVoteRows[0]?.vote_value ?? 0;

  // 2. Calculate new vote state and true delta
  const newVote = existingVote === inc_votes ? 0 : inc_votes;
  const trueDelta = newVote - existingVote;

  // 3. Update comment_votes table
  if (newVote === 0) {
    await db.query(
      `DELETE FROM comment_votes 
       WHERE username = $1 AND comment_id = $2`,
      [username, comment_id]
    );
  } else {
    await db.query(
      `INSERT INTO comment_votes (username, comment_id, vote_value)
       VALUES ($1, $2, $3)
       ON CONFLICT (username, comment_id) DO UPDATE 
         SET vote_value = $3`,
      [username, comment_id, newVote]
    );
  }

  // 4. Apply delta to comments.votes and return updated comment
  const { rows: updatedRows } = await db.query(
    `UPDATE comments 
     SET votes = votes + $1 
     WHERE comment_id = $2 
     RETURNING *`,
    [trueDelta, comment_id]
  );

  if (updatedRows.length === 0) {
    return Promise.reject({ status: 404, msg: "Comment not found" });
  }

  return updatedRows[0];
};
