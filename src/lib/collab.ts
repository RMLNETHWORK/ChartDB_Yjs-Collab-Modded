import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';

const WS_SERVER =
    import.meta.env.VITE_COLLAB_WS_URL || 'ws://192.168.1.12:1234';

const docCache = new Map<string, Y.Doc>();
const providerCache = new Map<string, WebsocketProvider>();

export function getCollabDoc(diagramId: string): Y.Doc {
    if (docCache.has(diagramId)) return docCache.get(diagramId)!;

    const ydoc = new Y.Doc();

    new IndexeddbPersistence(`chartdb-collab-${diagramId}`, ydoc);

    const provider = new WebsocketProvider(WS_SERVER, diagramId, ydoc, {
        connect: true,
        maxBackoffTime: 5000,
    });

    provider.on('status', (event: { status: string }) => {
        console.log(`[collab] ${diagramId} → ${event.status}`);
    });

    docCache.set(diagramId, ydoc);
    providerCache.set(diagramId, provider);
    return ydoc;
}

export function getDiagramMap(diagramId: string): Y.Map<unknown> {
    return getCollabDoc(diagramId).getMap('diagram');
}

export function destroyCollabDoc(diagramId: string): void {
    providerCache.get(diagramId)?.destroy();
    docCache.get(diagramId)?.destroy();
    providerCache.delete(diagramId);
    docCache.delete(diagramId);
}

export function waitForSync(diagramId: string): Promise<void> {
    return new Promise((resolve) => {
        const provider = providerCache.get(diagramId);
        if (!provider || provider.synced) {
            resolve();
            return;
        }
        provider.once('sync', () => resolve());
        setTimeout(resolve, 10000); // fallback if server unreachable
    });
}
