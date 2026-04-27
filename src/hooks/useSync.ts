import { useStore } from '../store/StoreContext';

/**
 * Hook to access sync state
 */
export const useSync = () => {
  const { state } = useStore();

  return {
    status: state.sync.status,
    lastSyncAt: state.sync.lastSyncAt,
    pendingChangesCount: state.sync.pendingChanges.length,
    conflictedItemsCount: state.sync.conflictedItems.length,
    hasConflicts: state.sync.conflictedItems.length > 0,
    lastError: state.sync.lastError,
    offlineMode: state.ui.offlineMode
  };
};
