const { removeComment, updateComment } = require("../models/comments.models");

exports.deleteComment = (req, res, next) => {
  const { comment_id } = req.params;
  removeComment(comment_id)
    .then(() => res.status(204).send())
    .catch(next);
};

exports.patchComment = (req, res, next) => {
  const { comment_id } = req.params;
  const { inc_votes, username } = req.body;

  if (inc_votes === undefined || !username) {
    return next({ status: 400, msg: "Missing required field" });
  }

  updateComment(comment_id, inc_votes, username)
    .then((comment) => {
      res.status(200).send({ comment });
    })
    .catch(next);
};
