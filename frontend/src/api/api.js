// This file contains all API calls to the API endpoints
// import axios to make API calls
import axios from "axios";

// Create HTTP client with the base URL, and specify that the data sent in the request body is JSON
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_ROOT_API,
  headers: {
    "Content-Type": "application/json",
  },
});

// ---------------------------------------------------------------------------
// Auth header + session helpers
// ---------------------------------------------------------------------------
const TOKEN_KEY = "authToken";

// Sets "Authorization: Bearer <token>" on every later request
export function setAuthHeader(token) {
  apiClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;
}

// Removes the Authorization header (logout, expired session)
export function removeAuthHeader() {
  delete apiClient.defaults.headers.common["Authorization"];
}

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// ---------------------------------------------------------------------------
// Centralised error handling (F2)
// The ONLY place that turns an Axios error into a user-facing message.
// Every rejected request becomes an Error with a short readable `.message`
// and the HTTP `.status` (undefined for network failures).
// ---------------------------------------------------------------------------
let onUnauthorized = () => {};

// main.js registers what happens on a 401 (clear Pinia state, go to /login).
// Kept as a callback so api.js never imports the store or router.
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

// Pulls a short message out of whatever shape the server sent back
function messageFromResponse(data) {
  if (!data) return null;
  if (typeof data === "string") {
    // the template sometimes sends a JSON string like { errors: [{ msg }] }
    try {
      const json = JSON.parse(data);
      if (json && json.errors && json.errors[0] && json.errors[0].msg) {
        return json.errors[0].msg;
      }
      return (json && (json.error || json.message)) || data;
    } catch {
      return data;
    }
  }
  if (Array.isArray(data.errors) && data.errors[0] && data.errors[0].msg) {
    return data.errors[0].msg;
  }
  const msg = data.error || data.message;
  return typeof msg === "string" ? messageFromResponse(msg) : null;
}

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // No response at all: server down, CORS block, offline, timeout
    if (!error.response) {
      const err = new Error("Unable to reach the server");
      err.status = undefined;
      return Promise.reject(err);
    }

    const { status, data } = error.response;

    // Expired / invalid token. A failed LOGIN can also return an error
    // status, so skip the redirect for the login call itself.
    const isLoginCall = (error.config.url || "").includes("/users/login");
    if (status === 401 && !isLoginCall) {
      clearStoredToken();
      removeAuthHeader();
      onUnauthorized();
    }

    const fallback =
      status >= 500
        ? "Something went wrong on the server"
        : status === 403
          ? "You do not have permission to do that"
          : status === 404
            ? "Not found"
            : "Request failed";
    const err = new Error(messageFromResponse(data) || fallback);
    err.status = status;
    return Promise.reject(err);
  }
);

// Login related API calls
// On success: store the token and set the Authorization header
export async function loginUser(username, password) {
  const response = await apiClient.post("/users/login", { username, password });
  const token = response.data.token;
  localStorage.setItem(TOKEN_KEY, token);
  setAuthHeader(token);
  return token;
}

// API call to log the user out
export function logoutUser() {
  clearStoredToken();
  removeAuthHeader();
}

// Org related API calls
// API call to get org name
export async function getOrgName() {
  const response = await apiClient.get(`/org`);
  return response.data;
}

// Events related API calls
// API call to get all events for org
export const getEvents = async () => {
  const response = await apiClient.get("/events/");
  return response.data;
};

// API call to GET single event by ID
export const getEventById = async (id) => {
  const response = await apiClient.get(`/events/id/${id}`);
  return response.data;
};

// API call to GET events based on search query
export const searchEvents = async (query) => {
  let params = {};
  if (query.searchBy === "name") {
    params.searchBy = query.searchBy;
    params.name = query.name || "";
  } else if (query.searchBy === "date") {
    params.searchBy = "date";
    params.eventDate = query.eventDate || "";
  }
  const response = await apiClient.get(`/events/search`, {
    params: params,
  });
  return response.data;
};

// API call to GET events for which a client is signed up
export const getClientEvents = async (id) => {
  const response = await apiClient.get(`/events/client/${id}`);
  return response.data;
};

// API call to GET events for which a client is not signed up
export const getNonClientEvents = async (id) => {
  const response = await apiClient.get(`/events/client/${id}/not-registered`);
  return response.data;
};

// API call to GET all attendees for an event
export const getEventAttendees = async (id) => {
  const response = await apiClient.get(`/events/attendees/${id}`);
  return response.data;
};

// API call to GET all events for a given service
export const getEventsByServiceId = async (id) => {
  const response = await apiClient.get(`/events/service/${id}`);
  return response.data;
};

// API call to POST new event
export const createEvent = async (eventData) => {
  const response = await apiClient.post("/events/", eventData);
  return response.data;
};

// API call to PUT update event
export const updateEvent = async (id, eventData) => {
  const response = await apiClient.put(`/events/update/${id}`, eventData);
  return response.data;
};

// API call to PUT add attendee to event
export const registerAttendee = async (eventId, clientId) => {
  const response = await apiClient.put(
    `/events/register`,
    {},
    {
      params: {
        event: eventId,
        client: clientId,
      },
    }
  );
  return response.data;
};

// API call to PUT remove attendee from event
export const deregisterAttendee = async (eventId, clientId) => {
  const response = await apiClient.put(
    `/events/deregister`,
    {},
    {
      params: {
        event: eventId,
        client: clientId,
      },
    }
  );
  return response.data;
};

// API call to DELETE event by ID
export const deleteEvent = async (id) => {
  const response = await apiClient.delete(`/events/${id}`);
  return response.data;
};

// API call to get events for last two month for dashboard
export const getAttendance = async () => {
  const response = await apiClient.get("/events/attendance");
  return response.data;
};

// Clients related API calls
// API call to GET all clients for org
export const getClients = async () => {
  const response = await apiClient.get("clients");
  return response.data;
};

// API call to GET single client by ID
export const getClientById = async (id) => {
  const response = await apiClient.get(`/clients/id/${id}`);
  return response.data;
};

// API call to GET entries based on search query
export const searchClients = async (query) => {
  let params = {};
  if (query.searchBy === "name") {
    params.searchBy = query.searchBy;
    params.firstName = query.firstName || "";
    params.lastName = query.lastName || "";
  } else if (query.searchBy === "number") {
    params.searchBy = query.searchBy;
    params.phoneNumber = query.phoneNumber || "";
  }
  const response = await apiClient.get("/clients/search", {
    params: params,
  });
  return response.data;
};

// API call to POST new client
export const createClient = async (newClient) => {
  const response = await apiClient.post("/clients", newClient);
  return response.data;
};

// API call to PUT update client
export const updateClient = async (id, updatedClient) => {
  const response = await apiClient.put(
    `/clients/update/${id}`,
    updatedClient
  );
  return response.data;
};

// API call to delete client
export const deleteClientbyId = async (id) => {
  const response = await apiClient.delete(`/clients/${id}`);
  return response.data;
};

// API call to get events for dashboard
export const getClientsByZipCode = async () => {
  const response = await apiClient.get("/clients/byzip");
  return response.data;
};

// API calls related to services
// API call to get all services for org
export const getServices = async () => {
  const response = await apiClient.get("/services/");
  return response.data;
};

// API call to GET single service by ID
export const getServiceById = async (id) => {
  const response = await apiClient.get(`/services/id/${id}`);
  return response.data;
};

// API call to GET services based on search query
export const searchServices = async (query) => {
  let params = {};
  params.searchBy = query.searchBy;
  if (query.searchBy === "name") {
    params.name = query.name || "";
  } else if (query.searchBy === "description") {
    params.description = query.description;
  }
  const response = await apiClient.get("/services/search", {
    params: params,
  });
  return response.data;
};

// API call to POST new service
export const createService = async (newService) => {
  const response = await apiClient.post("/services", newService);
  return response.data;
};

// API call to PUT update service
export const updateService = async (id, updatedService) => {
  const response = await apiClient.put(
    `/services/update/${id}`,
    updatedService
  );
  return response.data;
};

// API call to DELETE service by ID
export const deleteService = async (id) => {
  const response = await apiClient.delete(`/services/${id}`);
  return response.data;
};
