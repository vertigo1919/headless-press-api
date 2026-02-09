# Error Handling Strategy

This API uses standard HTTP status codes to indicate the success or failure of a request.

## Standard Errors

### 400 - Bad Request

Occurs when the client sends invalid data.

- **PSQL Error 22P02:** Invalid text representation (e.g., sending "banana" as an ID).
- **PSQL Error 23502:** Not Null Violation (e.g., trying to post a comment without a body).

### 404 - Not Found

Occurs when the resource requested does not exist.

- **Path Not Found:** When the URL path is spelled incorrectly.
- **Resource Not Found:** When a valid ID (e.g., `9999`) does not exist in the database.
- **PSQL Error 23503:** Foreign Key Violation (e.g., posting a comment for an article that doesn't exist).

### 500 - Internal Server Error

Occurs when an unhandled error happens on the server. The server logs the error to the console and sends a generic message to the client to avoid leaking sensitive information.

## Custom Error Objects

The API handles custom errors thrown by models in the following format:

```json
{
  "status": 404,
  "msg": "Article not found"
}
```
