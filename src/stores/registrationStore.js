import { ref, onMounted } from "vue";

const registrationRequests = ref([]);

function loadRequestsFromStorage() {
  try {
    const saved = localStorage.getItem("registrationRequests");
    if (saved) {
      registrationRequests.value = JSON.parse(saved);
    }
  } catch (e) {
    console.error("Failed to load registration requests:", e);
  }
}

function saveRequestsToStorage() {
  try {
    localStorage.setItem(
      "registrationRequests",
      JSON.stringify(registrationRequests.value)
    );
  } catch (e) {
    console.error("Failed to save registration requests:", e);
  }
}

function addRequest(username, password) {
  const newRequest = {
    id: Date.now(),
    username: username,
    password: password,
    status: "pending",
    created_at: new Date().toISOString(),
  };
  registrationRequests.value.push(newRequest);
  saveRequestsToStorage();
  return newRequest;
}

function removeRequest(requestId) {
  registrationRequests.value = registrationRequests.value.filter(
    (r) => r.id !== requestId
  );
  saveRequestsToStorage();
}

function hasPendingRequests() {
  return registrationRequests.value.length > 0;
}

export {
  registrationRequests,
  addRequest,
  removeRequest,
  hasPendingRequests,
  loadRequestsFromStorage,
};
