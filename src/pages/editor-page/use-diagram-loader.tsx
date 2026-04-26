import { useChartDB } from '@/hooks/use-chartdb';
import { useConfig } from '@/hooks/use-config';
import { useDialog } from '@/hooks/use-dialog';
import { useFullScreenLoader } from '@/hooks/use-full-screen-spinner';
import { useRedoUndoStack } from '@/hooks/use-redo-undo-stack';
import { useStorage } from '@/hooks/use-storage';
import type { Diagram } from '@/lib/domain/diagram';
import { getDiagramMap, waitForSync } from '@/lib/collab';
import { DatabaseType } from '@/lib/domain/database-type';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export const useDiagramLoader = () => {
    const [initialDiagram, setInitialDiagram] = useState<Diagram | undefined>();
    const { diagramId } = useParams<{ diagramId: string }>();
    const { config } = useConfig();
    const { loadDiagram, currentDiagram } = useChartDB();
    const { resetRedoStack, resetUndoStack } = useRedoUndoStack();
    const { showLoader, hideLoader } = useFullScreenLoader();
    const { openCreateDiagramDialog, openOpenDiagramDialog } = useDialog();
    const navigate = useNavigate();
    const { listDiagrams, addDiagram } = useStorage();
    const currentDiagramLoadingRef = useRef<string | undefined>(undefined);

    useEffect(() => {
        if (!config) return;
        if (currentDiagram?.id === diagramId) return;

        const loadDefaultDiagram = async () => {
            if (diagramId) {
                setInitialDiagram(undefined);
                showLoader();
                resetRedoStack();
                resetUndoStack();

                let diagram = await loadDiagram(diagramId);

                if (!diagram) {
                    // Not in local storage — try Yjs server
                    const yMap = getDiagramMap(diagramId);
                    await waitForSync(diagramId);

                    const yjsTables = yMap.get('tables') as unknown[];
                    if (yjsTables && yjsTables.length > 0) {
                        diagram = {
                            id: diagramId,
                            name: 'Shared Diagram',
                            databaseType: DatabaseType.GENERIC,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            tables: yMap.get('tables') as Diagram['tables'],
                            relationships:
                                (yMap.get(
                                    'relationships'
                                ) as Diagram['relationships']) ?? [],
                            dependencies:
                                (yMap.get(
                                    'dependencies'
                                ) as Diagram['dependencies']) ?? [],
                            areas:
                                (yMap.get('areas') as Diagram['areas']) ?? [],
                            customTypes:
                                (yMap.get(
                                    'customTypes'
                                ) as Diagram['customTypes']) ?? [],
                            notes:
                                (yMap.get('notes') as Diagram['notes']) ?? [],
                        };
                        await addDiagram({ diagram });
                        await loadDiagram(diagramId);
                    }
                }

                if (!diagram) {
                    openOpenDiagramDialog({ canClose: false });
                    hideLoader();
                    return;
                }

                setInitialDiagram(diagram);
                hideLoader();
                return;
            } else if (!diagramId && config.defaultDiagramId) {
                const diagram = await loadDiagram(config.defaultDiagramId);
                if (diagram) {
                    navigate(`/diagrams/${config.defaultDiagramId}`);
                    return;
                }
            }

            const diagrams = await listDiagrams();
            if (diagrams.length > 0) {
                openOpenDiagramDialog({ canClose: false });
            } else {
                openCreateDiagramDialog();
            }
        };

        if (
            currentDiagramLoadingRef.current === (diagramId ?? '') &&
            currentDiagramLoadingRef.current !== undefined
        ) {
            return;
        }

        currentDiagramLoadingRef.current = diagramId ?? '';
        loadDefaultDiagram();
    }, [
        diagramId,
        openCreateDiagramDialog,
        config,
        navigate,
        listDiagrams,
        addDiagram,
        loadDiagram,
        resetRedoStack,
        resetUndoStack,
        hideLoader,
        showLoader,
        currentDiagram?.id,
        openOpenDiagramDialog,
    ]);

    return { initialDiagram };
};
