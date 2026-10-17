import axios from "axios";
import { toast } from "react-toastify";
import { store } from "../redux/store";

let apiUrl = "";
if (document.URL.includes("localhost")) {
    apiUrl = "http://localhost:3000";
} else {
    apiUrl = "";
}

const http = axios.create({
    baseURL: apiUrl,
    //timeout: 1000,
    // headers: { "Content-Type": "application/json" },
});
http.interceptors.request.use(
    (config) => {
        const token = store.getState()?.auth?.details?.accessToken;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        console.log(error);
        return Promise.reject(error);
    }
);

http.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        console.log(error, "ERROR_Abdush");
        const status = error.response?.status;
        if (status === 401) {
            if (!error.config?.url?.includes("/api/v1/auth/login")) {
                localStorage.clear();
                window.location.href = "/";
            }
        } else if (status === 415) {
            toast.error(
                "Unsupported media type. Please upload image files only.",
                {
                    position: "bottom-right",
                }
            );
        }
        return Promise.reject(error);
    }
);

export default http;
