import { startRecording, stopRecording, onNetworkEvent, getRecordingState } from './debugger';

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'START_RECORDING') {
    // message.tabId should be provided or inferred?
    // Popup usually knows the active tab.
    const { tabId, description } = message;
    startRecording(tabId, description)
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // async response
  } else if (message.type === 'STOP_RECORDING') {
    const { tabId } = message;
    stopRecording(tabId)
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  } else if (message.type === 'GET_STATUS') {
    const { tabId } = message;
    const status = getRecordingState(tabId);
    sendResponse(status);
    return false; // sync response
  }
  
  // Other messages...
});

chrome.debugger.onEvent.addListener(onNetworkEvent);

// Handle detach (user clicked 'x' on the banner)
chrome.debugger.onDetach.addListener((source, _reason) => {
  if (source.tabId) {
    stopRecording(source.tabId).catch(console.error);
  }
});
