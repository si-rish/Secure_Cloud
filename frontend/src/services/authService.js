import api from "./api";
const authService={
async register(name,email,password){const r=await api.post("/api/v1/auth/register",{name,email,password});return r.data;},
async login(email,password){const r=await api.post("/api/v1/auth/login",{email,password});const {token,user}=r.data.data;localStorage.setItem("securecloud_token",token);localStorage.setItem("securecloud_user",JSON.stringify(user));return {token,user};},
logout(){localStorage.removeItem("securecloud_token");localStorage.removeItem("securecloud_user");},
getToken(){return localStorage.getItem("securecloud_token");},
getUser(){try{return JSON.parse(localStorage.getItem("securecloud_user")||"null")}catch{return null}}
}; export default authService;
