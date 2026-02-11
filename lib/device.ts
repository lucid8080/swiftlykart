// Re-export server functions
export {
  getServerDeviceId,
  setServerDeviceId,
  getPinListId,
  setPinListCookie,
  clearPinListCookie,
} from "./device-server";

// Re-export client functions
export {
  getClientDeviceId,
  initClientDeviceId,
  getDeviceHeaders,
  DEVICE_CONSTANTS,
} from "./device-client";
