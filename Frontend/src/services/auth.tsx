import http from "./http";

const user = {
    login: (data: any) => http.post("/api/v1/auth/login", data),
    signup: (data: any) => http.post("/api/v1/auth/signup", data),
    logout: () => http.post("/api/v1/auth/logout"),

};

export default user;

