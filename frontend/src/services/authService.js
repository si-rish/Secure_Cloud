import api from "./api";

const authService = {
// Register a user
async register(registrationData) {
try {
const response = await api.post(
"/api/v1/auth/register",
registrationData
);


  return response.data;
} catch (error) {
  const message =
    error.response?.data?.error?.message ||
    error.response?.data?.message ||
    "Registration failed. Please check your details and try again.";

  throw new Error(message);
}


},

// Login an existing user
async login(email, password) {
try {
const response = await api.post("/api/v1/auth/login", {
email,
password,
});


  const result = response.data;
  const authData = result.data || result;

  if (!authData.token) {
    throw new Error("Login response did not contain an authentication token.");
  }

  localStorage.setItem("securecloud_token", authData.token);

  if (authData.user) {
    localStorage.setItem(
      "securecloud_user",
      JSON.stringify(authData.user)
    );
  } else {
    localStorage.removeItem("securecloud_user");
  }

  return {
    ...result,
    token: authData.token,
    user: authData.user,
  };
} catch (error) {
  const message =
    error.response?.data?.error?.message ||
    error.response?.data?.message ||
    error.message ||
    "Login failed. Please check your credentials.";

  throw new Error(message);
}


},

// Logout the current user
logout() {
localStorage.removeItem("securecloud_token");
localStorage.removeItem("securecloud_user");
},

// Get the stored token
getToken() {
return localStorage.getItem("securecloud_token");
},

// Get the stored user
getUser() {
try {
const user = localStorage.getItem("securecloud_user");
return user ? JSON.parse(user) : null;
} catch {
return null;
}
},

// Check whether a token is stored
isAuthenticated() {
const token = this.getToken();
return Boolean(token);
},
};

export default authService;
