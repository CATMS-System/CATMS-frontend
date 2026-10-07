// base fetch client for the catms backend api

// placeholder for the future auth token from member 1
const authToken = null;

export async function request(method, path, body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (authToken) {
    options.headers['Authorization'] = `Bearer ${authToken}`;
  }

  if (body !== null && body !== undefined) {
    options.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(`/api/v1${path}`, options);
  } catch (err) {
    throw {
      status: 0,
      message: 'Cannot reach the server',
      fieldErrors: {}
    };
  }

  let json = null;
  const text = await response.text();
  if (text) {
    try {
      json = JSON.parse(text);
    } catch (parseErr) {
      json = null;
    }
  }

  if (!response.ok) {
    const status = response.status;
    let message = 'Something went wrong';
    const fieldErrors = {};

    if (json && json.detail) {
      if (typeof json.detail === 'string') {
        message = json.detail;
      } else if (Array.isArray(json.detail)) {
        message = 'Please check the entered values';
        for (const item of json.detail) {
          if (Array.isArray(item.loc) && item.loc.length > 0) {
            const field = item.loc[item.loc.length - 1];
            // remove pydantic prefix if present
            const cleanMsg = (item.msg || '').replace(/^Value error,\s*/i, '');
            fieldErrors[field] = cleanMsg;
          }
        }
      }
    } else if (status === 404) {
      message = 'Requested record not found';
    } else if (status === 409) {
      message = 'A conflicting record already exists';
    }

    throw {
      status,
      message,
      fieldErrors
    };
  }

  return json;
}
