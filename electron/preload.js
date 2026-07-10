const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("trpgHome", {
  saveText: (payload) => ipcRenderer.invoke("save-text", payload),
  openExternal: (url) => ipcRenderer.invoke("open-external", url),
});
