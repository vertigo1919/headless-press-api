const express = require("express");
const app = express();
const path = require("path");
const cors = require("cors");

const { getTopics } = require("./controllers/topics.controllers");
const {
  getArticles,
  getArticleById,
  patchArticle,
  getCommentsByArticleId,
  postComment,
} = require("./controllers/articles.controllers");
const {
  getUsers,
  getUserByUsername,
} = require("./controllers/users.controllers");
const { deleteComment } = require("./controllers/comments.controllers");

app.use(cors()); // << CORS stands for cross origin resource sharing, it's best placed before any middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const endpointsJson = require("./endpoints.json");

app.get("/api", (req, res) => {
  res.status(200).send({ endpoints: endpointsJson });
});

// Topics
app.get("/api/topics", getTopics);

// Articles
app.get("/api/articles", getArticles);
app.get("/api/articles/:article_id", getArticleById);
app.patch("/api/articles/:article_id", patchArticle);
app.get("/api/articles/:article_id/comments", getCommentsByArticleId);
app.post("/api/articles/:article_id/comments", postComment);

// Users
app.get("/api/users", getUsers);
app.get("/api/users/:username", getUserByUsername);

// Comments
app.delete("/api/comments/:comment_id", deleteComment);

// errors

// 404
app.use((req, res) => {
  res.status(404).send({ msg: "Path not found" });
});

// PSQL Errors
app.use((err, req, res, next) => {
  if (err.code === "22P02") {
    res.status(400).send({ msg: "Bad Request" }); // Invalid input
  } else if (err.code === "23502") {
    res.status(400).send({ msg: "Missing required field" }); // NULL
  } else if (err.code === "23503") {
    res.status(404).send({ msg: "Referenced entity not found" }); // ForeignKey
  } else {
    next(err);
  }
});

app.use((err, req, res, next) => {
  if (err.status && err.msg) {
    res.status(err.status).send({ msg: err.msg });
  } else {
    next(err);
  }
});

// Server Errors
app.use((err, req, res, next) => {
  console.log(err);
  res.status(500).send({ msg: "Internal Server Error" });
});

module.exports = app;
