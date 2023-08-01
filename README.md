# popcloudify

## Overview

The `popcloudify` project consists of a Cloudflare Worker implementation that serves as a proxy for interacting with a remote website. It provides endpoints to perform actions like login, creating new threads, editing posts, and replying to existing threads on the remote website.

## Base URL

The base URL for accessing the API is:
```
https://your-cloudflare-worker-url/api
```
Please replace `your-cloudflare-worker-url` with the actual URL where the Cloudflare Worker is deployed.

## Endpoints

### `GET /api`

- Description: Returns a simple JSON message to indicate the API is operational.
- Response:

  ```
  {
    "message": "OK"
  }
  ```

### `POST /api/login`

- Description: Handles user login by forwarding the login credentials to the remote server.
- Request Body:

  ```
  {
    "username": "your-username",
    "password": "your-password"
  }
  ```

- Response:

  ```
  {
    "success": true,
    "message": "Login success",
    "value": {
      "cdb_auth": "your-cdb-auth-cookie-value"
    }
  }
  ```

  ```
  {
    "success": false,
    "message": "Login Failed"
  }
  ```

### `POST /api/create`

- Description: Creates a new thread on the remote server.
- Request Body:

  ```
  {
    "cdb_auth": "your-cdb-auth-cookie-value",
    "options": {
      "fid": "forum-id"
    },
    "postParams": {
      "subject": "Thread Subject",
      "message": "Thread Content"
      // Additional post parameters if required
    }
  }
  ```

- Response:

  ```
  {
    "success": true,
    "message": "Post Success",
    "value": {
      "tid": "new-thread-id"
    }
  }
  ```

  ```
  {
    "success": false,
    "message": "Post Failed"
  }
  ```

### `POST /api/edit`

- Description: Edits an existing post on the remote server.
- Request Body:

  ```
  {
    "cdb_auth": "your-cdb-auth-cookie-value",
    "options": {
      "tid": "thread-id",
      "pid": "post-id"
    },
    "postParams": {
      "subject": "Edited Subject",
      "message": "Edited Content"
      // Additional post parameters if required
    }
  }
  ```

- Response:

  ```
  {
    "success": true,
    "message": "Post Success",
    "value": {
      "tid": "edited-thread-id",
      "pid": "edited-post-id"
    }
  }
  ```

  ```
  {
    "success": false,
    "message": "Post Failed"
  }
  ```

### `POST /api/reply`

- Description: Replies to an existing thread on the remote server.
- Request Body:

  ```
  {
    "cdb_auth": "your-cdb-auth-cookie-value",
    "options": {
      "tid": "thread-id"
    },
    "postParams": {
      "message": "Reply Content"
      // Additional post parameters if required
    }
  }
  ```

- Response:

  ```
  {
    "success": true,
    "message": "Post Success",
    "value": {
      "pid": "new-reply-id"
    }
  }
  ```

  ```
  {
    "success": false,
    "message": "Post Failed"
  }
  ```

## Error Handling

In case of errors, the API responds with a JSON object containing the `success` flag set to `false` and an appropriate error message in the `message` field.

## Notes

- The API relies on Cloudflare Workers and acts as a proxy to communicate with the remote server.
- For successful login, the API returns a `cdb_auth` cookie value that must be included in subsequent requests to perform authenticated actions.
- When sending requests to create, edit, or reply, ensure that the required parameters are provided in the request body to achieve successful operations.

## Usage

To use the `popcloudify` Cloudflare Worker, you can deploy the `worker.js` file along with its dependencies to your Cloudflare Workers environment. The worker will then be able to handle API requests and forward them to the remote server for processing.

Please note that this README provides an overview of the project structure and code. Make sure to configure your Cloudflare Workers environment and follow any additional setup steps required for proper execution.

For any questions or issues related to the `popcloudify` project, feel free to consult the project's maintainers or contributors.