import { db } from '@/lib/db';
import type { DbSession, DbHttpRecord } from '@/lib/db';
import type { HttpRecord } from '@/types';

interface RecordingSession {
  sessionId: string;
  tabId: number;
  description: string;
  domain: string; // Add domain property
  startTime: number;
  pendingRecords: Map<string, Partial<HttpRecord>>;
  recordCount: number;
}

const sessions = new Map<number, RecordingSession>();

export async function startRecording(tabId: number, description: string) {
  if (sessions.has(tabId)) {
    console.warn(`Already recording on tab ${tabId}`);
    return;
  }

  try {
    await chrome.debugger.attach({ tabId }, '1.3');
    await chrome.debugger.sendCommand({ tabId }, 'Network.enable');

    const sessionId = crypto.randomUUID();
    const startTime = Date.now();
    
    // Get URL of the tab
    const tab = await chrome.tabs.get(tabId);
    let domain = '';
    try {
        if (tab.url) {
            domain = new URL(tab.url).hostname;
        }
    } catch (e) { console.error('Invalid URL', e) }

    const session: DbSession = {
      id: sessionId,
      description,
      startTime,
      domain,
      recordCount: 0
    };

    await db.sessions.add(session);

    sessions.set(tabId, {
      sessionId,
      tabId,
      description,
      domain, // Add domain
      startTime,
      pendingRecords: new Map(),
      recordCount: 0
    });

    console.log(`Started recording on tab ${tabId}`);
  } catch (err) {
    console.error('Failed to start recording', err);
    throw err;
  }
}

export async function stopRecording(tabId: number) {
  const session = sessions.get(tabId);
  if (!session) return;

  try {
    await chrome.debugger.sendCommand({ tabId }, 'Network.disable');
    await chrome.debugger.detach({ tabId });
  } catch (e) {
    // Ignore detach errors (e.g. tab closed)
    console.warn('Error detaching', e);
  }

  // Update session end time
  await db.sessions.update(session.sessionId, {
    endTime: Date.now()
  });

  sessions.delete(tabId);
  console.log(`Stopped recording on tab ${tabId}`);
}

export function getRecordingState(tabId: number) {
  const session = sessions.get(tabId);
  if (!session) return { recording: false };
  return {
    recording: true,
    sessionId: session.sessionId,
    description: session.description,
    count: session.recordCount,
    startTime: session.startTime
  };
}

export async function onNetworkEvent(debuggeeId: chrome.debugger.Debuggee, message: string, params: any) {
  const tabId = debuggeeId.tabId;
  if (!tabId || !sessions.has(tabId)) return;

  const session = sessions.get(tabId)!;
  const { pendingRecords, sessionId } = session;

  if (message === 'Network.requestWillBeSent') {
    const { requestId, request, wallTime } = params;
    
    // Domain Filtering
    try {
        const url = new URL(request.url);
        // We match if the request hostname ends with the session domain
        // e.g. domain=example.com matches api.example.com, www.example.com
        // We check for falsy session.domain just in case, though it should remain set.
        if (session.domain && !url.hostname.endsWith(session.domain)) {
            return;
        }
    } catch (e) {
        // invalid url, ignore
        return;
    }

    // wallTime is seconds since epoch
    const record: Partial<HttpRecord> = {
      id: requestId, // We use requestId temporarily
      url: request.url,
      method: request.method,
      requestHeaders: request.headers,
      requestBody: request.postData, // might be undefined
      timestamp: wallTime * 1000
    };
    pendingRecords.set(requestId, record);
    
  } else if (message === 'Network.responseReceived') {
    const { requestId, response } = params;
    const record = pendingRecords.get(requestId);
    if (record) {
      record.responseStatus = response.status;
      record.responseHeaders = response.headers;
    }
  } else if (message === 'Network.loadingFinished') {
    const { requestId } = params;
    const record = pendingRecords.get(requestId);
    if (record) {
      // Try to get response body
      try {
        const result: any = await chrome.debugger.sendCommand({ tabId }, 'Network.getResponseBody', { requestId });
        record.responseBody = result.body;
      } catch (e) {
        // Body might not be available
      }

      // Finalize record
      const finalId = crypto.randomUUID();
      const finalRecord: DbHttpRecord = {
        ...(record as HttpRecord),
        sessionId,
        id: finalId
      };

      // Ensure timestamp is set (requestWillBeSent might be missed? unlikely)
      if (!finalRecord.timestamp) finalRecord.timestamp = Date.now();

      await db.records.add(finalRecord);
      
      // Update count in DB
      await db.sessions.where('id').equals(sessionId).modify(s => { s.recordCount += 1; });
      
      // Update local state
      session.recordCount += 1;
      
      pendingRecords.delete(requestId);
      
      // Broadcast update?
      chrome.runtime.sendMessage({ type: 'RECORD_ADDED', sessionId, count: session.recordCount });
    }
  }
}

